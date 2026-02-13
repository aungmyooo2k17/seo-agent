# DevOps Engineer — Agent Context

## Your Role

You are the **DevOps Engineer** responsible for:
- Docker containerization
- Environment configuration
- Build and deployment scripts

You make the system runnable and deployable.

---

## Your Responsibilities

1. **Dockerfile** — Multi-stage build, optimized image
2. **docker-compose.yml** — Service configuration
3. **Environment** — .env.example with all variables
4. **Scripts** — Helper scripts for setup and running

---

## Files You Own

```
/
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # Service definition
├── .env.example          # Environment template
├── .gitignore            # Git ignore patterns
├── .dockerignore         # Docker ignore patterns
└── scripts/
    ├── init-db.ts        # Database initialization
    └── run.sh            # Wrapper script for cron
```

---

## Implementation Requirements

### Dockerfile

```dockerfile
# ===========================================
# Build Stage
# ===========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ===========================================
# Production Stage
# ===========================================
FROM node:20-alpine AS production

# Install git and ssh for GitHub operations
RUN apk add --no-cache git openssh-client

# Create non-root user
RUN addgroup -g 1001 -S seoagent && \
    adduser -S -u 1001 -G seoagent seoagent

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy schema file (needed at runtime)
COPY src/db/schema.sql ./dist/db/

# Create data directories
RUN mkdir -p /data/repos /data/reports && \
    chown -R seoagent:seoagent /data

# Set environment
ENV NODE_ENV=production
ENV DATA_DIR=/data

# Switch to non-root user
USER seoagent

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1

# Default command
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  seo-agent:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: seo-agent

    # Environment variables
    environment:
      # AI Configuration
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AI_MODEL=${AI_MODEL:-claude-sonnet-4-20250514}
      - AI_MAX_TOKENS=${AI_MAX_TOKENS:-8192}

      # GitHub
      - GITHUB_TOKEN=${GITHUB_TOKEN}

      # Image Generation
      - IMAGE_PROVIDER=${IMAGE_PROVIDER:-replicate}
      - IMAGE_MODEL=${IMAGE_MODEL:-flux-schnell}
      - REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN}
      - MAX_IMAGES_PER_DAY=${MAX_IMAGES_PER_DAY:-5}

      # Google Search Console
      - GOOGLE_SERVICE_ACCOUNT_KEY=${GOOGLE_SERVICE_ACCOUNT_KEY}

      # Email Reports
      - RESEND_API_KEY=${RESEND_API_KEY}
      - EMAIL_FROM=${EMAIL_FROM:-SEO Agent <seo@example.com>}
      - REPORT_EMAIL=${REPORT_EMAIL}

      # Paths
      - DATA_DIR=/data
      - CONFIG_PATH=/app/config/repos.json

    # Volume mounts
    volumes:
      # Persist data between runs
      - seo-data:/data

      # Configuration (read-only)
      - ./config:/app/config:ro

      # SSH keys for private repos (read-only)
      - ${SSH_KEY_PATH:-~/.ssh}:/home/seoagent/.ssh:ro

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    # Run once and exit (for cron scheduling)
    restart: "no"

# Named volumes
volumes:
  seo-data:
    driver: local
```

### .env.example

```bash
# ===========================================
# SEO Agent Configuration
# ===========================================

# ===========================================
# AI Configuration (Required)
# ===========================================
# Get your API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Model to use (optional, defaults to claude-sonnet-4-20250514)
AI_MODEL=claude-sonnet-4-20250514

# Max tokens per request (optional, default: 8192)
AI_MAX_TOKENS=8192

# ===========================================
# GitHub Configuration (Required)
# ===========================================
# Personal Access Token with 'repo' scope
# Create at: https://github.com/settings/tokens
GITHUB_TOKEN=ghp_...

# Path to SSH keys (for private repos)
SSH_KEY_PATH=~/.ssh

# ===========================================
# Image Generation (Optional)
# ===========================================
# Provider: replicate | openai
IMAGE_PROVIDER=replicate

# Model: flux-schnell (fast) | flux-pro (quality) | dall-e-3
IMAGE_MODEL=flux-schnell

# Replicate API token (if using Replicate)
# Get at: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN=r8_...

# OpenAI API key (if using DALL-E)
# OPENAI_API_KEY=sk-...

# Daily image generation limit (cost control)
MAX_IMAGES_PER_DAY=5

# ===========================================
# Google Search Console (Optional)
# ===========================================
# Service account JSON (single line, or path to file)
# Setup guide: https://developers.google.com/webmaster-tools/v1/how-tos/service_accounts
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# ===========================================
# Email Reports (Optional)
# ===========================================
# Resend API key
# Get at: https://resend.com/api-keys
RESEND_API_KEY=re_...

# From address (must be verified in Resend)
EMAIL_FROM=SEO Agent <seo@yourdomain.com>

# Recipients (comma-separated)
REPORT_EMAIL=you@example.com,team@example.com

# ===========================================
# Paths (Usually don't need to change)
# ===========================================
DATA_DIR=/data
CONFIG_PATH=/app/config/repos.json
```

### .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Data (local development)
data/
*.db

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test
coverage/

# Temp
tmp/
temp/

# SSH keys (never commit!)
*.pem
*.key
id_rsa
id_ed25519
```

### .dockerignore

```dockerignore
# Git
.git
.gitignore

# Dependencies (installed in container)
node_modules

# Build artifacts
dist

# Data
data/
*.db

# Environment files
.env*

# Documentation
*.md
docs/

# IDE
.idea/
.vscode/

# Tests
tests/
coverage/
*.test.ts

# AI Team files (not needed in container)
.ai-team/

# Misc
.DS_Store
*.log
```

### scripts/init-db.ts

```typescript
#!/usr/bin/env ts-node

/**
 * Initialize the database schema
 * Run with: npx ts-node scripts/init-db.ts
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const DB_PATH = path.join(DATA_DIR, 'seo-agent.db')
const SCHEMA_PATH = path.join(__dirname, '../src/db/schema.sql')

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true })

// Initialize database
const db = new Database(DB_PATH)

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
db.exec(schema)

console.log(`✓ Database initialized at ${DB_PATH}`)

db.close()
```

### scripts/run.sh

```bash
#!/bin/bash
#
# Wrapper script for running SEO Agent via cron
# Usage: Add to crontab: 0 2 * * * /path/to/seo-agent/scripts/run.sh
#

set -e

# Navigate to project directory
cd "$(dirname "$0")/.."

# Log file
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/seo-agent-$(date +%Y%m%d).log"

echo "==========================================" >> "$LOG_FILE"
echo "SEO Agent Run - $(date)" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"

# Run with docker-compose
docker-compose up --build 2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Completed successfully - $(date)" >> "$LOG_FILE"
else
    echo "✗ Failed with exit code $EXIT_CODE - $(date)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
find "$LOG_DIR" -name "seo-agent-*.log" -mtime +30 -delete

exit $EXIT_CODE
```

---

## Cron Setup Instructions

### Option 1: System Crontab

```bash
# Edit crontab
crontab -e

# Add daily run at 2 AM
0 2 * * * /path/to/seo-agent/scripts/run.sh
```

### Option 2: Systemd Timer

Create `/etc/systemd/system/seo-agent.service`:
```ini
[Unit]
Description=SEO Agent Daily Run
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/path/to/seo-agent
ExecStart=/usr/bin/docker-compose up --build
StandardOutput=journal
StandardError=journal
```

Create `/etc/systemd/system/seo-agent.timer`:
```ini
[Unit]
Description=Run SEO Agent daily at 2 AM

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable seo-agent.timer
sudo systemctl start seo-agent.timer
```

---

## Dependencies

**None** — DevOps files are standalone.

**Requires:**
- Docker
- docker-compose
- (Optional) systemd for timer

---

## Quality Checklist

- [ ] Dockerfile builds successfully
- [ ] docker-compose runs without errors
- [ ] .env.example documents all variables
- [ ] .gitignore covers all sensitive/generated files
- [ ] .dockerignore optimizes build context
- [ ] init-db.ts creates database schema
- [ ] run.sh works with cron
- [ ] Container runs as non-root user
- [ ] Resource limits are reasonable
