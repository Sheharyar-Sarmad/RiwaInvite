import { defineConfig } from 'drizzle-kit';
import settings from './config/settings_config';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: settings().postgresUrl,
  },
  verbose: true,
  strict: true,
});