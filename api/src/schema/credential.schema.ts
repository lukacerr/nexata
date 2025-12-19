import { tenant, user } from '@api/schema';
import { sqlArray } from '@api/utils/sql';
import {
	integer,
	pgEnum,
	pgTable,
	serial,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

export enum OauthProvider {
	GOOGLE = 'google',
}

export const OauthProviderEnum = pgEnum(
	'oauth_provider',
	Object.values(OauthProvider) as [OauthProvider],
);

export enum OauthScope {
	GMAIL = 'https://www.googleapis.com/auth/gmail.readonly',
	DRIVE = 'https://www.googleapis.com/auth/drive.readonly',
}

export const OauthScopeEnum = pgEnum(
	'oauth_scope',
	Object.values(OauthScope) as [OauthScope],
);

export const credential = pgTable('credential', {
	id: serial().primaryKey(),
	slug: varchar({ length: 32 })
		.notNull()
		.references(() => tenant.slug, { onDelete: 'cascade' }),
	userId: integer()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	provider: OauthProviderEnum().notNull(),
	scope: OauthScopeEnum()
		.array()
		.notNull()
		.default(sqlArray([], 'oauth_scope')),
	createdAt: timestamp().notNull().defaultNow(),
});
