import { googleRouter } from '@api/auth/google';
import { jwtPlugin } from '@api/auth/lib';
import { db } from '@api/env';
import { user } from '@api/schema';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { HttpError } from 'elysia-logger';

export const authPlugin =
	(admin: boolean = false) =>
	(app: Elysia) =>
		app
			.use(jwtPlugin)
			.guard({
				headers: t.Object({
					// biome-ignore lint/suspicious/noTemplateCurlyInString: Bearer check
					authorization: t.TemplateLiteral('Bearer ${string}'),
				}),
			})
			.resolve(async ({ headers: { authorization }, jwt }) => {
				const at = authorization?.split(' ')[1];
				const payload = await jwt.verify(at);
				if (!at || !payload || (admin && !payload.isAdmin))
					throw HttpError.Unauthorized();
				return { activeUser: payload };
			});

export const authRouter = new Elysia({ prefix: '/auth', tags: ['Auth'] })
	.use(googleRouter)
	.use(jwtPlugin)
	.post(
		'/refresh-token',
		async ({ body: { token }, refreshJwt, jwt }) => {
			const payload = await refreshJwt.verify(token);
			if (!payload) throw HttpError.Unauthorized();

			const u = (
				await db
					.select({
						id: user.id,
						email: user.email,
						slug: user.slug,
						isAdmin: user.isAdmin,
					})
					.from(user)
					.where(eq(user.id, payload.id))
			).at(0);

			if (!u) throw HttpError.Forbidden();

			const [accessToken, refreshToken] = await Promise.all([
				jwt.sign(u),
				refreshJwt.sign(u),
			]);

			return { accessToken, refreshToken };
		},
		{
			detail: { summary: 'Refresh token' },
			body: t.Object({ token: t.String() }),
		},
	);
