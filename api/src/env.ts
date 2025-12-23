import { deepinfra } from '@ai-sdk/deepinfra';
import { openai } from '@ai-sdk/openai';
import type { EmbeddingModelV2 } from '@ai-sdk/provider';
import type * as schema from '@api/schema';
import { neon } from '@neondatabase/serverless';
import { Redis } from '@upstash/redis';
import { upstashCache } from 'drizzle-orm/cache/upstash';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { Logger } from 'elysia-logger';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const logger = new Logger({
	level: IS_PRODUCTION ? 'warn' : 'trace',
	name: 'Standalone',
});

// * --- VARS --- *

export const requireEnv = (key: string): string =>
	process.env[key] ||
	(() => {
		throw new Error(`${key} is not defined`);
	})();

export const warnEnv = (key: string): string => {
	const value = process.env[key];
	if (!value) logger.warn(`${key} is not defined`);
	return value ?? '';
};

export const NEXATA_SECRET = requireEnv('NEXATA_SECRET');

export const CACHE_CREDENTIALS = {
	url: requireEnv('UPSTASH_REDIS_REST_URL'),
	token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
};

export const DATABASE_URL = requireEnv('DATABASE_URL');

export const DEPLOYMENT_URL = requireEnv('DEPLOYMENT_URL');
export const getOauthCallback = (key: string) =>
	`${DEPLOYMENT_URL}/auth/${key}/callback`;

export type Oauth2Credentials = [
	clientId: string,
	clientSecret: string,
	redirectURI: string,
];

// * --- SINGLETONS --- *

export const cache = new Redis(CACHE_CREDENTIALS);

export const db = drizzle({
	client: neon(DATABASE_URL),
	cache: upstashCache({
		...CACHE_CREDENTIALS,
		global: true,
		config: { ex: 120 },
	}),
	casing: 'snake_case',
	logger: !IS_PRODUCTION,
}) as NeonHttpDatabase<typeof schema>;

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_SIZE = 768;
export const EMBEDDING_OVERLAP = 94;

// deepinfra.textEmbeddingModel('BAAI/bge-m3');
export const EMBEDDING_MODEL: EmbeddingModelV2<string> =
	openai.textEmbeddingModel('text-embedding-3-small');

export const BATCH_EMBEDDING_MODEL: EmbeddingModelV2<string> =
	deepinfra.textEmbeddingModel('BAAI/bge-m3');

// * --- ACTIVE CONFIG --- *

export const PRICING = {
	baseBill: 100,
	oneMessageRefill: 0.1,
	embedPerMb: 0.009,
	storedMbPerMonth: 0.002,
};
