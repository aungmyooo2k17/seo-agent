# SEO Agency - Runtime AI Team

This module implements an **AI-powered SEO agency** that operates like a team of specialists.

## The Problem

The current SEO agent is a single-threaded pipeline:
- Clone → Scan → Fix → Push

It lacks the **strategic thinking** of a real SEO agency:
- No competitor analysis
- No keyword research
- No content strategy
- No understanding of what's working vs not
- No prioritization based on business goals

## The Solution: AI Agency Model

Instead of a mechanical pipeline, we implement **specialized AI agents** that collaborate:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEO AGENCY (Runtime)                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   KEYWORD   │  │ COMPETITOR  │  │   CONTENT   │              │
│  │  RESEARCHER │  │   ANALYST   │  │  STRATEGIST │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│                  ┌───────────────┐                               │
│                  │  SEO DIRECTOR │  ← Coordinates all analysis   │
│                  │  (Strategist) │    and creates action plan    │
│                  └───────┬───────┘                               │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  TECHNICAL  │  │   CONTENT   │  │    LINK     │              │
│  │ SEO AUDITOR │  │   WRITER    │  │  OPTIMIZER  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Roles

### Research Phase (runs first)

| Agent | Responsibility |
|-------|----------------|
| **Keyword Researcher** | Find keyword opportunities, search volume, difficulty, gaps |
| **Competitor Analyst** | Analyze top-ranking competitors, their content, backlinks |
| **Content Strategist** | Plan content calendar, topic clusters, content gaps |

### Strategy Phase

| Agent | Responsibility |
|-------|----------------|
| **SEO Director** | Synthesize all research, prioritize actions, create strategic plan |

### Execution Phase

| Agent | Responsibility |
|-------|----------------|
| **Technical Auditor** | Find and fix technical SEO issues |
| **Content Writer** | Create SEO-optimized content based on strategy |
| **Link Optimizer** | Optimize internal linking structure |

## Data Sources

The agency needs external data to make informed decisions:

1. **Google Search Console** - Current rankings, impressions, CTR
2. **Competitor Data** - What competitors rank for (via SerpAPI, DataForSEO, etc.)
3. **Keyword Data** - Search volume, difficulty (via APIs or scraping)
4. **Content Analysis** - Analyze competitor content structure

## Example Workflow

```typescript
// 1. Research Phase - gather intelligence
const keywordData = await keywordResearcher.analyze(domain, niche)
const competitorData = await competitorAnalyst.analyze(domain, competitors)
const contentGaps = await contentStrategist.findGaps(profile, keywordData)

// 2. Strategy Phase - synthesize and plan
const agencyContext = {
  profile,
  issues,
  metrics,
  keywordData,
  competitorData,
  contentGaps,
}
const strategicPlan = await seoDirector.createPlan(agencyContext)

// 3. Execution Phase - implement the plan
for (const action of strategicPlan.actions) {
  switch (action.executor) {
    case 'technical-auditor':
      await technicalAuditor.execute(action)
      break
    case 'content-writer':
      await contentWriter.execute(action)
      break
    case 'link-optimizer':
      await linkOptimizer.execute(action)
      break
  }
}
```

## Implementation Plan

### Phase 1: Enhanced Strategist (DONE)
- [x] SEO Strategist that thinks before acting
- [x] Uses historical data to inform decisions

### Phase 2: Research Agents
- [ ] Keyword Researcher agent
- [ ] Competitor Analyst agent
- [ ] Content Strategist agent

### Phase 3: SEO Director
- [ ] Upgrade Strategist to SEO Director
- [ ] Synthesize inputs from all research agents
- [ ] Create comprehensive strategic plans

### Phase 4: External Data Integration
- [ ] SerpAPI or DataForSEO integration for keyword data
- [ ] Competitor content scraping
- [ ] Backlink analysis (Ahrefs/Moz API)

## Key Insight

The difference between a **tool** and an **agency**:

| Tool | Agency |
|------|--------|
| Fixes issues it finds | Researches what issues to prioritize |
| Generates content on schedule | Plans content based on keyword opportunities |
| Works in isolation | Understands the competitive landscape |
| Follows rules | Makes strategic decisions |

We're building an **agency**, not just a tool.
