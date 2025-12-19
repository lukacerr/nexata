import { cache, db } from '@api/data';
import { getOauthCallback, type Oauth2Credentials, warnEnv } from '@api/env';
import { user } from '@api/schema';
import {
	mapScope,
	type OauthExtendedState,
	oauthExtendedState,
} from '@api/utils/auth';
import { isString } from '@api/utils/type';
import { and, eq } from 'drizzle-orm';
import Elysia from 'elysia';
import {
	ForbiddenException,
	GoneException,
	NotAcceptableException,
} from 'elysia-http-exception';
import { oauth2 } from 'elysia-oauth2';

const GOOGLE_CLIENT_CREDENTIALS: Oauth2Credentials = [
	warnEnv('GOOGLE_CLIENT_ID'),
	warnEnv('GOOGLE_CLIENT_SECRET'),
	getOauthCallback('google'),
];

export const googleRouter = new Elysia({ prefix: `/google` })
	.use(oauth2({ Google: GOOGLE_CLIENT_CREDENTIALS }))
	.get(
		'/',
		async ({ oauth2, query }) => {
			const q: OauthExtendedState = query;

			const url = oauth2.createURL(
				'Google',
				['openid', 'profile', 'email', mapScope(q.scope)].filter(isString),
			);

			if (q) {
				url.searchParams.set('access_type', 'offline');
				url.searchParams.set('prompt', 'consent');
			}

			const state = url.searchParams.get('state');
			if (!state) throw new NotAcceptableException('STATE_NOT_FOUND');

			await cache.set<OauthExtendedState>(state, q, { ex: 3600 });

			return redirect(url.href);
		},
		{ query: oauthExtendedState },
	)
	.get('/callback', async ({ oauth2, query }) => {
		const { state } = query as { state: string };
		const tokens = await oauth2.authorize('Google');

		// TODO: Obtener el mail, no parece estar dentro de tokens
		const email = 'test@ejemplo.com';

		const cachedState = await cache.getdel<OauthExtendedState>(state);
		if (!cachedState) throw new GoneException('STATE_NOT_FOUND');

		if (
			cachedState.scope &&
			tokens.hasScopes() &&
			// @ts-expect-error
			!tokens.scopes().includes(mapScope(cachedState.scope))
		)
			throw new NotAcceptableException('SCOPE_MISMATCH');

		const uid = (
			await db
				.select({ id: user.id })
				.from(user)
				.where(and(eq(user.email, email), eq(user.slug, cachedState.tenant)))
		).at(0)?.id;

		if (!uid) throw new ForbiddenException('USER_NOT_FOUND');

		// TODO: Si no hay cachedState.scope, Firmar JWT nuevo con secret local y devolver
		// else salvar los tokens con el scope a la db y devolver OK
	});
