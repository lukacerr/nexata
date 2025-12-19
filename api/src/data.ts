import { CACHE_CREDENTIALS, DATABASE_URL } from '@api/env';
import type * as schema from '@api/schema';
import { neon } from '@neondatabase/serverless';
import { Redis } from '@upstash/redis';
import { upstashCache } from 'drizzle-orm/cache/upstash';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

export const cache = new Redis(CACHE_CREDENTIALS);

export const db: NeonHttpDatabase<typeof schema> = drizzle({
	client: neon(DATABASE_URL),
	cache: upstashCache({
		...CACHE_CREDENTIALS,
		global: true,
		config: { ex: 120 },
	}),
	casing: 'snake_case',
	logger: true,
});
