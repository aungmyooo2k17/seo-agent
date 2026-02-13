/**
 * Change tracking and impact measurement
 * Tracks SEO changes and measures their effectiveness over time
 */

import { randomUUID } from 'crypto';
import type {
  IDatabase,
  Change,
  ChangeType,
  MeasuredImpact,
  DailyMetrics,
} from '../types';

/**
 * Input for creating a new change record
 */
export interface ChangeInput {
  repoId: string;
  type: ChangeType;
  file: string;
  description: string;
  commitSha: string;
  affectedPages: string[];
  expectedImpact: string;
}

/**
 * Impact measurement configuration
 */
export interface ImpactConfig {
  /** Days to measure before the change */
  daysBefore: number;
  /** Days to measure after the change */
  daysAfter: number;
  /** Minimum days to wait before measuring */
  minWaitDays: number;
}

const DEFAULT_IMPACT_CONFIG: ImpactConfig = {
  daysBefore: 7,
  daysAfter: 7,
  minWaitDays: 14,
};

/**
 * Tracks SEO changes and measures their impact
 */
export class ChangeTracker {
  private readonly config: ImpactConfig;

  /**
   * Creates a new ChangeTracker
   *
   * @param db - Database for persistence
   * @param config - Impact measurement configuration
   */
  constructor(
    private readonly db: IDatabase,
    config?: Partial<ImpactConfig>
  ) {
    this.config = { ...DEFAULT_IMPACT_CONFIG, ...config };
  }

  /**
   * Records a new change
   *
   * @param input - Change details
   * @returns The generated change ID
   */
  async trackChange(input: ChangeInput): Promise<string> {
    const id = randomUUID();
    const change: Change = {
      id,
      repoId: input.repoId,
      timestamp: new Date(),
      type: input.type,
      file: input.file,
      description: input.description,
      commitSha: input.commitSha,
      affectedPages: input.affectedPages,
      expectedImpact: input.expectedImpact,
    };

    await this.db.saveChange(change);
    return id;
  }

  /**
   * Measures the impact of a change by comparing metrics before and after
   *
   * @param changeId - ID of the change to measure
   * @param daysBefore - Days to look back before change (default: 7)
   * @param daysAfter - Days to look at after change (default: 7)
   */
  async measureImpact(
    changeId: string,
    daysBefore: number = this.config.daysBefore,
    daysAfter: number = this.config.daysAfter
  ): Promise<void> {
    const change = await this.db.getChange(changeId);
    if (!change) {
      console.warn(`Change not found: ${changeId}`);
      return;
    }

    // Check if enough time has passed
    const now = new Date();
    const daysSinceChange = Math.floor(
      (now.getTime() - change.timestamp.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceChange < daysAfter) {
      console.log(`Not enough time passed to measure impact for change ${changeId}`);
      return;
    }

    // Calculate date ranges
    const changeDate = new Date(change.timestamp);

    const beforeStart = new Date(changeDate);
    beforeStart.setDate(beforeStart.getDate() - daysBefore);

    const beforeEnd = new Date(changeDate);
    beforeEnd.setDate(beforeEnd.getDate() - 1);

    const afterStart = new Date(changeDate);
    afterStart.setDate(afterStart.getDate() + 1);

    const afterEnd = new Date(changeDate);
    afterEnd.setDate(afterEnd.getDate() + daysAfter);

    // Get metrics from database
    const metricsBefore = await this.db.getMetricsRange(change.repoId, beforeStart, beforeEnd);
    const metricsAfter = await this.db.getMetricsRange(change.repoId, afterStart, afterEnd);

    // Calculate average clicks for affected pages
    const clicksBefore = this.calculateAverageClicks(metricsBefore, change.affectedPages);
    const clicksAfter = this.calculateAverageClicks(metricsAfter, change.affectedPages);

    const impact: MeasuredImpact = {
      clicksBefore,
      clicksAfter,
      measurementPeriod: daysAfter,
    };

    await this.db.updateChange(changeId, { measuredImpact: impact });
  }

  /**
   * Measures impact for all changes that are ready to be measured
   *
   * @param repoId - Repository to check
   */
  async measurePendingImpacts(repoId: string): Promise<void> {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - this.config.minWaitDays);

    // Get all changes from the past that haven't been measured yet
    // This would require a more sophisticated query - for now, scan recent changes
    const recentDate = new Date(now);
    recentDate.setDate(recentDate.getDate() - 30);

    const changes = await this.getChangesInRange(repoId, recentDate, cutoffDate);

    for (const change of changes) {
      if (!change.measuredImpact) {
        await this.measureImpact(change.id);
      }
    }
  }

  /**
   * Gets all changes for a repository within a date range
   */
  private async getChangesInRange(
    repoId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Change[]> {
    const changes: Change[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayChanges = await this.db.getChangesForDate(repoId, new Date(currentDate));
      changes.push(...dayChanges);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return changes;
  }

  /**
   * Calculates average daily clicks for specific pages
   */
  private calculateAverageClicks(metrics: DailyMetrics[], affectedPages: string[]): number {
    if (metrics.length === 0) return 0;

    let totalClicks = 0;
    let count = 0;

    for (const day of metrics) {
      for (const page of day.pages) {
        // Match if page URL contains any affected page path
        if (affectedPages.some((affected) => page.page.includes(affected))) {
          totalClicks += page.clicks;
          count++;
        }
      }
    }

    // If no specific pages found, use total clicks
    if (count === 0) {
      return metrics.reduce((sum, m) => sum + m.clicks, 0) / metrics.length;
    }

    return totalClicks / metrics.length;
  }

  /**
   * Gets the change type description for reporting
   */
  static getChangeTypeDescription(type: ChangeType): string {
    const descriptions: Record<ChangeType, string> = {
      'meta-title': 'Meta title optimization',
      'meta-description': 'Meta description optimization',
      'og-tags': 'Open Graph tags added',
      schema: 'Structured data added',
      sitemap: 'Sitemap updated',
      robots: 'Robots.txt updated',
      'blog-published': 'New blog post published',
      'image-added': 'Image added',
      'alt-text': 'Alt text optimized',
      'internal-link': 'Internal links added',
      'content-update': 'Content updated',
    };

    return descriptions[type] ?? type;
  }

  /**
   * Calculates the impact percentage change
   */
  static calculateImpactPercentage(impact: MeasuredImpact): number {
    if (impact.clicksBefore === 0) {
      return impact.clicksAfter > 0 ? 100 : 0;
    }
    return ((impact.clicksAfter - impact.clicksBefore) / impact.clicksBefore) * 100;
  }
}
