import { bill, user } from '@api/schema';
import { desc } from 'drizzle-orm';
import {
	date,
	index,
	numeric,
	pgEnum,
	pgTable,
	uuid,
} from 'drizzle-orm/pg-core';

export enum BillableEventType {
	EMBED = 'embed', // Consumption in MBs
	STORAGE = 'storage', // Consumption in MBs
	REFILL = 'refill', // Consumption in messages
}

export const BillableEventTypeEnum = pgEnum(
	'billable_event_type',
	Object.values(BillableEventType) as [BillableEventType],
);

export const billableEvent = pgTable(
	'billable_event',
	{
		id: uuid().primaryKey().defaultRandom(),
		type: BillableEventTypeEnum().notNull(),
		consumption: numeric().notNull(),
		billId: uuid().references(() => bill.id),
		userId: uuid().references(() => user.id),
		createdAt: date().notNull().defaultNow(),
	},
	(table) => [
		index('billable_event_created_at_desc').on(desc(table.createdAt)),
	],
);
