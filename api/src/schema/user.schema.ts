import { tenant } from '@api/schema';
import { lowerIndex } from '@api/utils/sql';
import {
	boolean,
	pgTable,
	primaryKey,
	serial,
	varchar,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
	'user',
	{
		id: serial().primaryKey(),
		email: varchar({ length: 320 }).notNull(),
		slug: varchar({ length: 32 })
			.notNull()
			.references(() => tenant.slug, { onDelete: 'cascade' }),
		displayName: varchar({ length: 64 }),
		isAdmin: boolean().notNull().default(false),
	},
	(table) => [
		primaryKey({ columns: [table.email, table.slug] }),
		lowerIndex(table.email),
	],
);
