/**
 * Test setup configuration
 * Loaded before all tests via Jest setupFilesAfterEnv
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-anthropic-key-12345';
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'test-github-token-12345';
process.env.AI_API_KEY = process.env.AI_API_KEY || 'test-ai-key-12345';
process.env.AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test@example.com';
process.env.EMAIL_TO = process.env.EMAIL_TO || 'recipient@example.com';
process.env.DATA_DIR = './tests/tmp';

// Ensure tmp directory exists
const tmpDir = path.join(process.cwd(), 'tests', 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Increase timeout for AI tests
jest.setTimeout(30000);

// Global mock for fetch to prevent accidental API calls
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ content: [{ type: 'text', text: '{}' }] }),
    text: () => Promise.resolve(''),
  })
);

// Clean up tmp directory after all tests
afterAll(async () => {
  const tmpPath = path.join(process.cwd(), 'tests', 'tmp');
  if (fs.existsSync(tmpPath)) {
    fs.rmSync(tmpPath, { recursive: true, force: true });
  }
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
