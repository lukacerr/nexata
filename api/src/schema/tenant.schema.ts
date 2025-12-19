import { matchRegex } from '@api/utils/sql';
import { check, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const tenant = pgTable(
	'tenant',
	{
		slug: varchar({ length: 32 }).primaryKey(),
		displayName: varchar({ length: 64 }),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		check('slug_check', matchRegex(table.slug, /^[a-z0-9-_]{2,32}$/)),
	],
);
