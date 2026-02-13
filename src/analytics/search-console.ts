/**
 * Google Search Console API client
 * Fetches search performance metrics for SEO analysis
 */

import { google, searchconsole_v1 } from 'googleapis';
import type { ISearchConsoleClient, DailyMetrics, PageMetrics, QueryMetrics } from '../types';


/**
 * Raw row data from Search Console API
 */
interface SearchConsoleRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

/**
 * Google Search Console client for fetching SEO metrics
 * Implements ISearchConsoleClient for dependency injection
 */
export class SearchConsoleClient implements ISearchConsoleClient {
  private readonly searchconsole: searchconsole_v1.Searchconsole | null = null;
  private readonly isConfigured: boolean;

  /**
   * Creates a new SearchConsoleClient
   * Requires GOOGLE_SERVICE_ACCOUNT_KEY environment variable with JSON credentials
   */
  constructor() {
    const credentials = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'];

    if (!credentials) {
      console.warn('GOOGLE_SERVICE_ACCOUNT_KEY not set, Search Console client disabled');
      this.isConfigured = false;
      return;
    }

    try {
      const parsedCredentials = JSON.parse(credentials) as Record<string, unknown>;
      const auth = new google.auth.GoogleAuth({
        credentials: parsedCredentials,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });

      this.searchconsole = google.searchconsole({ version: 'v1', auth });
      this.isConfigured = true;
    } catch (err) {
      console.error('Failed to initialize Search Console client:', err);
      this.isConfigured = false;
    }
  }

  /**
   * Gets metrics for a single day
   *
   * @param siteUrl - The site URL as registered in Search Console
   * @param date - The date to fetch metrics for
   * @returns Daily metrics with page and query breakdowns
   */
  async getDailyMetrics(siteUrl: string, date: Date): Promise<DailyMetrics> {
    if (!this.isConfigured || !this.searchconsole) {
      return this.emptyMetrics(siteUrl, date);
    }

    const dateStr = this.formatDate(date);

    try {
      // Fetch aggregate, page, and query metrics in parallel
      const [aggregate, pages, queries] = await Promise.all([
        this.fetchAggregateMetrics(siteUrl, dateStr, dateStr),
        this.fetchPageMetrics(siteUrl, dateStr, dateStr),
        this.fetchQueryMetrics(siteUrl, dateStr, dateStr),
      ]);

      return {
        repoId: '', // Will be set by caller
        date,
        clicks: aggregate.clicks,
        impressions: aggregate.impressions,
        ctr: aggregate.ctr,
        position: aggregate.position,
        clicksChange: 0, // Will be calculated by caller with historical data
        impressionsChange: 0,
        ctrChange: 0,
        positionChange: 0,
        pages,
        queries,
      };
    } catch (err) {
      console.error('Error fetching Search Console metrics:', err);
      return this.emptyMetrics(siteUrl, date);
    }
  }

  /**
   * Gets metrics for a date range
   *
   * @param siteUrl - The site URL as registered in Search Console
   * @param startDate - Start of the range
   * @param endDate - End of the range
   * @returns Array of daily metrics
   */
  async getMetricsRange(siteUrl: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]> {
    if (!this.isConfigured || !this.searchconsole) {
      return [];
    }

    const metrics: DailyMetrics[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayMetrics = await this.getDailyMetrics(siteUrl, new Date(currentDate));
      metrics.push(dayMetrics);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return metrics;
  }

  /**
   * Fetches aggregate metrics (no dimension breakdown)
   */
  private async fetchAggregateMetrics(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<{ clicks: number; impressions: number; ctr: number; position: number }> {
    if (!this.searchconsole) {
      return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    }

    const response = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
      },
    });

    const rows = response.data.rows ?? [];
    if (rows.length === 0) {
      return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    }

    const row = rows[0] as SearchConsoleRow;
    return {
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    };
  }

  /**
   * Fetches per-page metrics
   */
  private async fetchPageMetrics(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<PageMetrics[]> {
    if (!this.searchconsole) {
      return [];
    }

    const response = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 100,
      },
    });

    const rows = (response.data.rows ?? []) as SearchConsoleRow[];
    return rows.map((row) => ({
      page: row.keys?.[0] ?? '',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  }

  /**
   * Fetches per-query metrics
   */
  private async fetchQueryMetrics(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<QueryMetrics[]> {
    if (!this.searchconsole) {
      return [];
    }

    const response = await this.searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 100,
      },
    });

    const rows = (response.data.rows ?? []) as SearchConsoleRow[];
    return rows.map((row) => ({
      query: row.keys?.[0] ?? '',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  }

  /**
   * Creates an empty metrics object for when API is unavailable
   */
  private emptyMetrics(_siteUrl: string, date: Date): DailyMetrics {
    return {
      repoId: '',
      date,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      clicksChange: 0,
      impressionsChange: 0,
      ctrChange: 0,
      positionChange: 0,
      pages: [],
      queries: [],
    };
  }

  /**
   * Formats a date as YYYY-MM-DD for the API
   */
  private formatDate(date: Date): string {
    const isoString = date.toISOString().split('T')[0];
    return isoString ?? '';
  }

  /**
   * Checks if the client is properly configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }
}
