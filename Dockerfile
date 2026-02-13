# =============================================================================
# AGI-SEO-Optimizer Dockerfile
# Multi-stage build for TypeScript SEO automation agent
# =============================================================================

# -----------------------------------------------------------------------------
# Build Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3, sharp)
RUN apk add --no-cache python3 make g++ git

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy TypeScript configuration and source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies for smaller production image
RUN npm prune --production

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install runtime dependencies
# - git: for cloning and managing target repositories
# - openssh-client: for SSH-based git operations
# - ca-certificates: for HTTPS connections
RUN apk add --no-cache \
    git \
    openssh-client \
    ca-certificates

# Create non-root user for security
RUN addgroup -g 1001 -S seoagent && \
    adduser -S -u 1001 -G seoagent seoagent

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy schema file (needed at runtime for database initialization)
COPY src/db/schema.sql ./dist/db/

# Create data directories with proper ownership
# - /data/repos: cloned target repositories
# - /data/reports: generated SEO reports
RUN mkdir -p /data/repos /data/reports && \
    chown -R seoagent:seoagent /app /data

# Configure git for the seoagent user
RUN git config --system user.email "seo-agent@automated.local" && \
    git config --system user.name "SEO Agent"

# Set production environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/data

# Switch to non-root user
USER seoagent

# Configure SSH to not prompt for host key verification
RUN mkdir -p ~/.ssh && \
    echo "Host github.com\n\tStrictHostKeyChecking no\n\tUserKnownHostsFile /dev/null" > ~/.ssh/config

# Health check - verify Node.js is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('ok')" || exit 1

# Default command
CMD ["node", "dist/index.js"]
