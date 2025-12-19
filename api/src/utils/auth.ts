import { OauthScope } from '@api/schema';
import { type Static, t } from 'elysia';

const scopeAliases: Record<keyof typeof OauthScope, OauthScope> = {
	GMAIL: OauthScope.GMAIL,
	DRIVE: OauthScope.DRIVE,
} as const;

const scopeKeys = Object.keys(
	scopeAliases,
) as readonly (keyof typeof scopeAliases)[];
type ScopeAlias = (typeof scopeKeys)[number];

export const oauthExtendedState = t.Object({
	tenant: t.String(),
	scope: t.Optional(t.Union(scopeKeys.map((key) => t.Literal(key)))),
});

export type OauthExtendedState = Static<typeof oauthExtendedState>;

export const mapScope = (alias?: ScopeAlias): OauthScope | undefined =>
	alias ? scopeAliases[alias] : undefined;
