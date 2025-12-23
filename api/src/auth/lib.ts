import { cache, db, IS_PRODUCTION, NEXATA_SECRET } from '@api/env';
import {
	credential,
	type OauthProvider,
	OauthScope,
	realOauthScopes,
	scopesPerProvider,
	user,
} from '@api/schema';
import { lowerEq } from '@api/utils/sql';
import jwt from '@elysiajs/jwt';
import { and, eq } from 'drizzle-orm';
import Elysia, { redirect, type Static, t } from 'elysia';
import { HttpError } from 'elysia-logger';
import { decodeIdToken, type OAuth2Tokens } from 'elysia-oauth2';

export const jwtPayload = t.Object({
	id: t.String({ format: 'uuid' }),
	email: t.String(),
	slug: t.String(),
	isAdmin: t.Boolean(),
});

export const jwtPlugin = new Elysia()
	.use(
		jwt({
			name: 'jwt',
			exp: IS_PRODUCTION ? '12h' : '1y',
			secret: NEXATA_SECRET,
			schema: jwtPayload,
		}),
	)
	.use(
		jwt({
			name: 'refreshJwt',
			exp: '30d',
			secret: NEXATA_SECRET,
			schema: jwtPayload,
		}),
	);

export const oauthExtendedState = (provider?: OauthProvider) =>
	t.Object({
		tenant: t.String({ minLength: 2, pattern: '^[a-z0-9]{2,16}$' }),
		scope: t.Optional(
			provider
				? t.Union(scopesPerProvider[provider].map((scope) => t.Literal(scope)))
				: t.Enum(OauthScope),
		),
		redirect: t.Optional(t.String({ format: 'uri' })),
	});

export const plainOauthExtendedState = oauthExtendedState();
export type OauthExtendedState = Static<typeof plainOauthExtendedState>;

export async function createOauthRedirect(
	query: OauthExtendedState,
	urlFunc: (q: OauthExtendedState) => Promise<URL>,
) {
	const url = await urlFunc(query);

	const state = url.searchParams.get('state');
	if (!state) throw HttpError.Conflict('STATE_NOT_FOUND');

	await cache.set(state, query, { ex: 3600 });
	return redirect(url.href);
}

export async function authorizeOauthCallback(
	provider: OauthProvider,
	query: { state: string },
	tokens: OAuth2Tokens,
	// biome-ignore lint/suspicious/noExplicitAny: JWT miss-type
	jwtSign: (signValue: any) => Promise<string>,
	// biome-ignore lint/suspicious/noExplicitAny: JWT miss-type
	refreshJwtSign: (signValue: any) => Promise<string>,
	metadataFunc: (
		decodedIdToken: object,
		callbackData: object,
	) => Promise<{
		email: string;
		refreshTokenExpiresAt?: Date;
		name?: string;
	}>,
) {
	const q = await cache.getdel<OauthExtendedState>(query.state);
	if (!q) throw HttpError.Conflict('STATE_NOT_FOUND');

	if (
		q.scope &&
		tokens.hasScopes() &&
		realOauthScopes[q.scope].some((scope) => !tokens.scopes().includes(scope))
	)
		throw HttpError.Conflict('SCOPE_MISMATCH');

	if (q.scope && !tokens.hasRefreshToken())
		throw HttpError.Conflict('NO_REFRESH_TOKEN');

	const metadata = await metadataFunc(
		decodeIdToken(tokens.idToken()),
		tokens.data,
	);

	if (q.scope && !metadata.refreshTokenExpiresAt)
		throw HttpError.Conflict('NO_REFRESH_TOKEN_EXPIRATION');

	const u = (
		await db
			.select()
			.from(user)
			.where(
				and(
					lowerEq(user.email, metadata.email.toLowerCase()),
					eq(user.slug, q.tenant.toLowerCase()),
				),
			)
	).at(0);

	if (!u?.id) throw HttpError.Forbidden('USER_NOT_FOUND');

	if (!u.displayName && metadata.name)
		await db
			.update(user)
			.set({ displayName: metadata.name })
			.where(eq(user.id, u.id));

	const url = q.redirect && new URL(q.redirect);

	if (!q.scope) {
		const [accessToken, refreshToken] = await Promise.all([
			jwtSign(u),
			refreshJwtSign(u),
		]);

		if (url) {
			url.searchParams.set('at', accessToken);
			url.searchParams.set('rt', refreshToken);
		}

		return url ? redirect(url.href) : { accessToken, refreshToken };
	}

	const set = {
		accessToken: tokens.accessToken(),
		accessTokenExpiresAt: tokens.accessTokenExpiresAt(),
		refreshToken: tokens.refreshToken(),
		// biome-ignore lint/style/noNonNullAssertion: no reach
		refreshTokenExpiresAt: metadata.refreshTokenExpiresAt!,
	};

	await db
		.insert(credential)
		.values({
			userId: u.id,
			provider: provider,
			scope: [q.scope],
			...set,
		})
		.onConflictDoUpdate({
			set,
			target: [credential.userId, credential.provider, credential.scope],
		});

	return url ? redirect(url.href) : true;
}
