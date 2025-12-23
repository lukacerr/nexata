import { user } from '@api/schema';
import { sqlArray } from '@api/utils/sql';
import { desc } from 'drizzle-orm';
import { index } from 'drizzle-orm/gel-core';
import {
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export enum OauthProvider {
	GOOGLE = 'google',
	MICROSOFT = 'microsoft',
	DROPBOX = 'dropbox',
}

export enum OauthScope {
	GMAIL = 'gmail',
	DRIVE = 'drive',
}

export const scopesPerProvider: Record<OauthProvider, OauthScope[]> = {
	[OauthProvider.GOOGLE]: [OauthScope.GMAIL, OauthScope.DRIVE],
	[OauthProvider.MICROSOFT]: [],
	[OauthProvider.DROPBOX]: [],
} as const;

export const realOauthScopes: Record<OauthScope, string[]> = {
	[OauthScope.GMAIL]: ['https://www.googleapis.com/auth/gmail.readonly'],
	[OauthScope.DRIVE]: ['https://www.googleapis.com/auth/drive.readonly'],
} as const;

export const OauthProviderEnum = pgEnum(
	'oauth_provider',
	Object.values(OauthProvider) as [OauthProvider],
);

export const OauthScopeEnum = pgEnum(
	'oauth_scope',
	Object.values(OauthScope) as [OauthScope],
);

export const credential = pgTable(
	'credential',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		provider: OauthProviderEnum().notNull(),
		scope: OauthScopeEnum()
			.array()
			.notNull()
			.default(sqlArray([], OauthScopeEnum.enumName)),
		accessToken: varchar({ length: 4096 }).notNull(),
		accessTokenExpiresAt: timestamp().notNull(),
		refreshToken: varchar({ length: 4096 }).notNull(),
		refreshTokenExpiresAt: timestamp().notNull(),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		index('credential_created_at_desc').on(desc(table.createdAt)),
		uniqueIndex('credential_unicity').on(
			table.userId,
			table.provider,
			table.scope,
		),
	],
);
