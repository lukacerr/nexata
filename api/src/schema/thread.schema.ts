import { desc } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const thread = pgTable(
	'thread',
	{
		id: uuid().primaryKey().defaultRandom(),
		title: varchar({ length: 320 }),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [index('created_at_desc').on(desc(table.createdAt))],
);
