#!/usr/bin/env ts-node

/**
 * Database Initialization Script
 *
 * Initializes the SQLite database with the required schema.
 * Safe to run multiple times - uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage:
 *   npx ts-node scripts/init-db.ts
 *   npm run init-db
 *
 * Environment:
 *   DATA_DIR - Directory for database file (default: ./data)
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const DATA_DIR = process.env.DATA_DIR || './data'
const DB_PATH = path.join(DATA_DIR, 'seo-agent.db')

// Schema path - handle both development and production paths
const SCHEMA_PATHS = [
  path.join(__dirname, '../src/db/schema.sql'),      // Development
  path.join(__dirname, '../dist/db/schema.sql'),     // Production (when running from dist)
]

function findSchemaPath(): string {
  for (const schemaPath of SCHEMA_PATHS) {
    if (fs.existsSync(schemaPath)) {
      return schemaPath
    }
  }
  throw new Error(
    `Schema file not found. Searched paths:\n${SCHEMA_PATHS.map(p => `  - ${p}`).join('\n')}`
  )
}

function initializeDatabase(): void {
  console.log('='.repeat(60))
  console.log('AGI-SEO-Optimizer Database Initialization')
  console.log('='.repeat(60))

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    console.log(`✓ Created data directory: ${DATA_DIR}`)
  } else {
    console.log(`✓ Data directory exists: ${DATA_DIR}`)
  }

  // Find schema file
  const schemaPath = findSchemaPath()
  console.log(`✓ Found schema file: ${schemaPath}`)

  // Check if database already exists
  const dbExists = fs.existsSync(DB_PATH)
  if (dbExists) {
    console.log(`! Database already exists: ${DB_PATH}`)
    console.log('  Running schema to ensure all tables exist...')
  }

  // Initialize database connection
  const db = new Database(DB_PATH)

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Read and execute schema
  const schema = fs.readFileSync(schemaPath, 'utf-8')

  try {
    db.exec(schema)
    console.log(`✓ Schema executed successfully`)
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's just a "table already exists" error
      if (error.message.includes('already exists')) {
        console.log(`! Some tables already exist (this is fine)`)
      } else {
        throw error
      }
    }
  }

  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as { name: string }[]

  console.log(`\n✓ Database tables:`)
  tables.forEach(t => console.log(`  - ${t.name}`))

  // Get database file size
  const stats = fs.statSync(DB_PATH)
  const sizeKB = (stats.size / 1024).toFixed(2)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✓ Database initialized successfully`)
  console.log(`  Path: ${path.resolve(DB_PATH)}`)
  console.log(`  Size: ${sizeKB} KB`)
  console.log(`  Tables: ${tables.length}`)
  console.log('='.repeat(60))

  db.close()
}

// Run initialization
try {
  initializeDatabase()
  process.exit(0)
} catch (error) {
  console.error('\n✗ Database initialization failed:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
