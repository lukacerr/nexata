import { authPlugin } from '@api/auth';
import { db } from '@api/env';
import { credential, user } from '@api/schema';
import { jsonBuildObject } from '@api/utils/sql';
import { and, eq, inArray } from 'drizzle-orm';
import Elysia, { t } from 'elysia';

export const credentialRouter = new Elysia({
	prefix: '/credential',
	tags: ['Credential'],
})
	.use(authPlugin())
	.delete(
		'/:id',
		async ({ params: { id }, activeUser }) =>
			db
				.delete(credential)
				.where(
					and(
						eq(credential.id, id),
						!activeUser.isAdmin
							? eq(credential.userId, activeUser.id)
							: undefined,
						inArray(
							credential.userId,
							db
								.select({ id: user.id })
								.from(user)
								.where(eq(user.slug, activeUser.slug)),
						),
					),
				)
				.returning({ credential: credential.id }),
		{
			detail: { summary: 'Delete credential by ID' },
			params: t.Object({ id: t.String({ format: 'uuid' }) }),
		},
	)
	.get(
		'/',
		async ({ activeUser }) =>
			db
				.select({
					id: credential.id,
					userId: credential.userId,
					provider: credential.provider,
					scope: credential.scope,
					createdAt: credential.createdAt,
					user: jsonBuildObject({
						id: user.id,
						email: user.email,
						displayName: user.displayName,
					}),
				})
				.from(credential)
				.innerJoin(user, eq(user.id, credential.userId))
				.where(
					and(
						!activeUser.isAdmin
							? eq(credential.userId, activeUser.id)
							: undefined,
						eq(user.slug, activeUser.slug),
					),
				),
		{ detail: { summary: 'List credentials' } },
	)
	.patch('/refresh/:id', async ({ params: { id }, activeUser }) => {}, {
		detail: { summary: 'Refresh credential by ID', tags: ['TODO'] },
		params: t.Object({ id: t.String({ format: 'uuid' }) }),
	});
