# AI Development Team Structure

## For Users: How to Report Bugs / Request Features

**Just edit `.ai-team/FEEDBACK.md` and write whatever you want.**

Examples:
- "the scanner crashes on my monorepo"
- "can you add support for SvelteKit?"
- "blog generation is too slow"
- "I hate how the config works"

That's it. The Product Manager agent will:
1. Read your feedback
2. Classify it (bug/feature/improvement)
3. Prioritize it
4. Write proper requirements
5. Assign it to the right engineer

You don't need templates. Just describe what's wrong or what you want.

---

## Overview

This project is built by a team of AI agents, each with specific expertise and responsibilities. Agents work concurrently on their domains while coordinating through shared context files.

---

## Team Roster

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI DEVELOPMENT TEAM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐                              │
│  │   PRODUCT    │ ←→  │   ARCHITECT  │  ← Oversees tech, resolves   │
│  │   MANAGER    │     │    (Lead)    │    conflicts                 │
│  └──────┬───────┘     └──────┬───────┘                              │
│         │                    │                                       │
│         │  Backlog/Reqs      │  Technical Direction                 │
│         └────────────────────┤                                       │
│                              │                                       │
│   ┌──────┴──────────────────────────────────────────────┐          │
│   │                                                      │          │
│   ▼                    ▼                    ▼            ▼          │
│ ┌────────┐      ┌────────────┐      ┌──────────┐   ┌─────────┐     │
│ │BACKEND │      │ AI/PROMPTS │      │INTEGR'NS │   │ DEVOPS  │     │
│ │Engineer│      │  Engineer  │      │ Engineer │   │Engineer │     │
│ └────────┘      └────────────┘      └──────────┘   └─────────┘     │
│     │                 │                   │              │          │
│     │                 │                   │              │          │
│   ┌─┴────────┐   ┌────┴───┐        ┌─────┴────┐        │          │
│   │          │   │        │        │          │        │          │
│   ▼          ▼   ▼        ▼        ▼          ▼        │          │
│ ┌────┐  ┌──────┐ ┌────┐ ┌─────┐ ┌──────┐ ┌───────┐    │          │
│ │ DB │  │SCANNER│ │ AI │ │CONT-│ │GITHUB│ │GOOGLE │    │          │
│ │    │  │  SEO │ │CLNT│ │ ENT │ │      │ │  API  │    │          │
│ └────┘  └──────┘ └────┘ └─────┘ └──────┘ └───────┘    │          │
│                                                        │          │
│                         ┌──────────────────────────────┘          │
│                         │                                          │
│                         ▼                                          │
│                   ┌──────────┐                                     │
│                   │    QA    │  ← Tests everything at the end      │
│                   │ Engineer │                                     │
│                   └──────────┘                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Agent Definitions

### 0. PRODUCT MANAGER

**Role:** Feature requests, bug tracking, roadmap, requirements

**Responsibilities:**
- Triage and prioritize feature requests
- Categorize and track bugs
- Maintain product backlog
- Write clear requirements for engineering
- Roadmap planning

**Owns:**
- `BACKLOG.md`
- `ROADMAP.md` (if created)
- `/rfcs/` (feature specifications)

**Context File:** `.ai-team/agents/product-manager.md`

---

### 1. ARCHITECT (Tech Lead)

**Role:** System design, code review, conflict resolution, integration

**Responsibilities:**
- Define overall architecture
- Review PRs from other agents
- Resolve conflicts between agents
- Ensure consistency across codebase
- Final integration testing

**Owns:**
- `/src/index.ts` (main orchestrator)
- `/src/types/` (shared type definitions)
- `PLAN.md`, `TODO.md`
- Architecture decisions

**Context File:** `.ai-team/agents/architect.md`

---

### 2. BACKEND Engineer

**Role:** Core infrastructure, database, configuration

**Responsibilities:**
- Database schema and operations
- Configuration loading
- Core utilities
- Error handling patterns
- Logging infrastructure

**Owns:**
- `/src/db/`
- `/src/config/`
- `/src/utils/` (if needed)

**Dependencies:** None (foundational)

**Context File:** `.ai-team/agents/backend.md`

---

### 3. AI/PROMPTS Engineer

**Role:** Claude integration, prompt engineering, AI client

**Responsibilities:**
- Anthropic API client
- All system prompts
- AI response parsing
- Token optimization
- Quality of AI outputs

**Owns:**
- `/src/ai/`

**Dependencies:** Config (from Backend)

**Context File:** `.ai-team/agents/ai-engineer.md`

---

### 4. SCANNER/SEO Engineer

**Role:** Codebase analysis, SEO logic, optimization rules

**Responsibilities:**
- Framework detection
- Codebase profiling
- SEO issue detection
- All optimizer modules
- SEO best practices

**Owns:**
- `/src/scanner/`
- `/src/optimizer/` (except images)

**Dependencies:** AI Client (from AI Engineer)

**Context File:** `.ai-team/agents/seo-engineer.md`

---

### 5. CONTENT Engineer

**Role:** Blog generation, content pipeline, images

**Responsibilities:**
- Content generation logic
- Blog formatting per framework
- Image generation
- Alt text generation
- Content calendar

**Owns:**
- `/src/optimizer/content.ts`
- `/src/optimizer/images/`

**Dependencies:** AI Client, Scanner

**Context File:** `.ai-team/agents/content-engineer.md`

---

### 6. INTEGRATIONS Engineer

**Role:** External APIs (GitHub, Google, Email)

**Responsibilities:**
- GitHub client (clone, commit, push)
- Google Search Console integration
- Email delivery (Resend)
- External API error handling

**Owns:**
- `/src/github/`
- `/src/analytics/`
- `/src/reports/email.ts`

**Dependencies:** Config

**Context File:** `.ai-team/agents/integrations.md`

---

### 7. DEVOPS Engineer

**Role:** Docker, deployment, CI/CD, infrastructure

**Responsibilities:**
- Dockerfile optimization
- docker-compose setup
- Environment configuration
- Build scripts
- Cron/scheduling setup

**Owns:**
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `scripts/`

**Dependencies:** Needs final codebase to containerize

**Context File:** `.ai-team/agents/devops.md`

---

### 8. QA Engineer

**Role:** Testing, validation, edge cases

**Responsibilities:**
- Write test cases
- Test with real repositories
- Validate AI outputs
- Find edge cases
- Document bugs

**Owns:**
- `/tests/`
- Test documentation

**Dependencies:** All other agents (tests at the end)

**Context File:** `.ai-team/agents/qa.md`

---

## Work Phases & Parallelization

### Phase 1: Foundation (Parallel)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   BACKEND    │  │  AI ENGINEER │  │   DEVOPS     │
│              │  │              │  │              │
│ • Database   │  │ • AI Client  │  │ • Dockerfile │
│ • Config     │  │ • Prompts    │  │ • Compose    │
│ • Types      │  │              │  │ • .env       │
└──────────────┘  └──────────────┘  └──────────────┘
     │                  │                  │
     └──────────────────┼──────────────────┘
                        ▼
                   [CHECKPOINT 1]
```

### Phase 2: Core Features (Parallel)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ SEO ENGINEER │  │   CONTENT    │  │ INTEGRATIONS │
│              │  │   ENGINEER   │  │   ENGINEER   │
│ • Scanner    │  │ • Content    │  │ • GitHub     │
│ • Frameworks │  │   generator  │  │ • Google API │
│ • Optimizer  │  │ • Images     │  │ • Email      │
└──────────────┘  └──────────────┘  └──────────────┘
     │                  │                  │
     └──────────────────┼──────────────────┘
                        ▼
                   [CHECKPOINT 2]
```

### Phase 3: Integration (Sequential)
```
┌──────────────────────────────────────────────────┐
│                   ARCHITECT                       │
│                                                   │
│  • Wire everything together in index.ts          │
│  • Resolve any conflicts                         │
│  • Integration testing                           │
└──────────────────────────────────────────────────┘
                        │
                        ▼
                   [CHECKPOINT 3]
```

### Phase 4: Quality (Sequential)
```
┌──────────────────────────────────────────────────┐
│                   QA ENGINEER                     │
│                                                   │
│  • Test with real repos                          │
│  • Validate outputs                              │
│  • Document issues                               │
└──────────────────────────────────────────────────┘
                        │
                        ▼
                     [DONE]
```

---

## File Ownership Matrix

| Directory/File | Owner | Can Modify | Read Only |
|----------------|-------|------------|-----------|
| `FEEDBACK.md` | User | User | Product Manager |
| `BACKLOG.md` | Product Manager | Product Manager | All |
| `ROADMAP.md` | Product Manager | Product Manager, Architect | All |
| `/src/index.ts` | Architect | Architect | All |
| `/src/types/` | Architect | Architect, All (additions) | - |
| `/src/config/` | Backend | Backend | All |
| `/src/db/` | Backend | Backend | All |
| `/src/ai/` | AI Engineer | AI Engineer | SEO, Content |
| `/src/scanner/` | SEO Engineer | SEO Engineer | Content |
| `/src/optimizer/` (except images) | SEO Engineer | SEO Engineer | - |
| `/src/optimizer/content.ts` | Content Engineer | Content | SEO |
| `/src/optimizer/images/` | Content Engineer | Content | - |
| `/src/github/` | Integrations | Integrations | All |
| `/src/analytics/` | Integrations | Integrations | All |
| `/src/reports/` | Integrations | Integrations | All |
| `Dockerfile` | DevOps | DevOps | All |
| `docker-compose.yml` | DevOps | DevOps | All |
| `/tests/` | QA | QA | All |

---

## Communication Protocol

### Shared State
- All agents read `PROJECT_CONTEXT.md` for overall understanding
- All agents read `INTERFACES.md` for type contracts
- Each agent has their own context file with detailed instructions

### Handoffs
When an agent completes their work:
1. Update their section in `STATUS.md`
2. Document any interfaces/exports other agents need
3. Note any blockers or dependencies

### Conflicts
If two agents need to modify the same file:
1. Architect decides ownership
2. One agent implements, other reviews
3. Or: split file into separate modules

---

## How to Run an Agent

Each agent is invoked with:
1. **Project context** — Overall project understanding
2. **Agent context** — Their specific role and responsibilities
3. **Current state** — What's been built so far
4. **Task** — What to build now

Example prompt structure:
```
<project_context>
{contents of PROJECT_CONTEXT.md}
</project_context>

<agent_context>
{contents of agents/{agent}.md}
</agent_context>

<current_state>
{list of files that exist, recent changes}
</current_state>

<task>
Build the database module as specified in your agent context.
Create all files in /src/db/.
</task>
```

---

## Agent Invocation Order

### Batch 0 (Pre-Development)
0. Product Manager — Backlog, priorities, requirements

### Batch 1 (Concurrent)
1. Backend Engineer — DB, Config
2. AI Engineer — AI Client, Prompts
3. DevOps Engineer — Docker setup

### Batch 2 (Concurrent, after Batch 1)
4. SEO Engineer — Scanner, Optimizers
5. Content Engineer — Content, Images
6. Integrations Engineer — GitHub, Google, Email

### Batch 3 (Sequential, after Batch 2)
7. Architect — Integration, index.ts

### Batch 4 (Sequential, after Batch 3)
8. QA Engineer — Testing

---

## Success Criteria

Each agent must:
- [ ] Create all files in their domain
- [ ] Follow TypeScript strict mode
- [ ] Use types from `/src/types/`
- [ ] Export clean public interfaces
- [ ] Handle errors appropriately
- [ ] Add JSDoc comments for public APIs
- [ ] Update STATUS.md when done
