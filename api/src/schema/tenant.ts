import { matchRegex } from '@api/utils/sql';
import {
	check,
	integer,
	pgTable,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

export const tenant = pgTable(
	'tenant',
	{
		slug: varchar({ length: 16 }).primaryKey(),
		displayName: varchar({ length: 64 }),
		logoUrl: varchar(),
		messageLimit: integer().notNull().default(1000),
		defaultMessageLimit: integer().notNull().default(1000),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [check('slug_check', matchRegex(table.slug, /^[a-z0-9]{2,16}$/))],
);
