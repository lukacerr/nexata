import { authPlugin } from '@api/auth';
import { db } from '@api/env';
import { user } from '@api/schema';
import { and, eq } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-typebox';
import Elysia, { t } from 'elysia';

const [insertUser, updateUser] = [
	createInsertSchema(user, { email: t.String({ format: 'email' }) }),
	createUpdateSchema(user, { email: t.String({ format: 'email' }) }),
];

export const userRouter = new Elysia({ prefix: '/user' })
	.use(authPlugin(true))
	.post(
		'/',
		async ({ body, activeUser }) =>
			db
				.insert(user)
				.values({ ...body, slug: activeUser.slug })
				.returning({ id: user.id }),
		{
			detail: { summary: 'Create user' },
			body: t.Omit(insertUser, ['id', 'slug']),
		},
	)
	.get(
		'/:id',
		async ({ params: { id }, activeUser }) =>
			db
				.select()
				.from(user)
				.where(and(eq(user.id, id), eq(user.slug, activeUser.slug))),
		{
			detail: { summary: 'Read user by ID' },
			params: t.Object({ id: t.String({ format: 'uuid' }) }),
		},
	)
	.patch(
		'/:id',
		async ({ body, params: { id }, activeUser }) =>
			db
				.update(user)
				.set(body)
				.where(and(eq(user.id, id), eq(user.slug, activeUser.slug)))
				.returning({ id: user.id }),
		{
			detail: { summary: 'Update user by ID' },
			body: t.Omit(updateUser, ['id', 'slug']),
			params: t.Object({ id: t.String({ format: 'uuid' }) }),
		},
	)
	.delete(
		'/:id',
		async ({ params: { id }, activeUser }) =>
			db
				.delete(user)
				.where(and(eq(user.id, id), eq(user.slug, activeUser.slug)))
				.returning({ id: user.id }),
		{
			detail: { summary: 'Delete user by ID' },
			params: t.Object({ id: t.String({ format: 'uuid' }) }),
		},
	)
	.get(
		'/',
		async ({ activeUser }) =>
			db.select().from(user).where(eq(user.slug, activeUser.slug)),
		{
			detail: { summary: 'List users' },
		},
	);
