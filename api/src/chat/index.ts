import { authPlugin } from '@api/auth';
import { BUILD_SYSTEM_PROMPT, MODEL, REASONING_MODEL } from '@api/chat/lib';
import { cache, db } from '@api/env';
import { type MessageRole, message, thread } from '@api/schema';
import { getThreadMessages } from '@api/utils/chat';
import { type ModelMessage, stepCountIs, streamText } from 'ai';
import { and, desc, eq, ilike, lt } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const chatRouter = new Elysia({ prefix: '/chat', tags: ['Chat'] })
	.use(authPlugin())
	.post(
		'/',
		async ({ body, activeUser }) => {
			// TODO: Validar limite de mensajes del tenant

			const userMessage: ModelMessage = {
				role: 'user',
				content: [{ type: 'text', text: body.prompt }],
			};

			const threadMessages = body.threadId
				? [
						...(await getThreadMessages(body.threadId, {
							content: 'partial',
							userId: activeUser.id,
							avoidCaching: true,
						})),
						userMessage,
					]
				: [userMessage];

			const tools = {};

			// imgs: groq('meta-llama/llama-4-maverick-17b-128e-instruct')
			const stream = streamText({
				model: body.extraReason ? REASONING_MODEL : MODEL,
				system: BUILD_SYSTEM_PROMPT(body.languagePreference),
				stopWhen: stepCountIs(10),
				messages: threadMessages,
				tools,
				onFinish: async ({ finishReason, response: { messages } }) => {
					if (finishReason !== 'stop')
						throw new Error('FINISH_REASON_NOT_STOP');

					const messagesToAppend = [userMessage, ...messages];

					const threadId =
						body.threadId ??
						(
							await db
								.insert(thread)
								.values({
									userId: activeUser.id,
									title: ((x: string) =>
										x.length >= 28 ? `${x.slice(0, 25)}...` : x)(
										body.prompt.charAt(0).toUpperCase() + body.prompt.slice(1),
									),
								})
								.returning({ id: thread.id })
						).at(0)?.id;

					if (!threadId) throw new Error('THREAD_NOT_CREATED');

					await db.insert(message).values(
						messagesToAppend.map((m) => ({
							threadId,
							role: m.role as MessageRole,
							content: m.content,
						})),
					);

					await cache.set(threadId, [...threadMessages, ...messagesToAppend], {
						ex: 60 * 5,
					});
				},
			});

			return stream.toUIMessageStreamResponse({
				headers: { 'Content-Type': 'text/event-stream' },
			});
		},
		{
			detail: { summary: 'Chat with LLM' },
			body: t.Object({
				prompt: t.String(),
				extraReason: t.Optional(
					t.Boolean({
						default: false,
						description:
							'If true, uses a heavier reasoning model in exchange of two message credits.',
					}),
				),
				threadId: t.Optional(
					t.String({
						format: 'uuid',
						description:
							'UUID of the thread. If none, a new thread will be created.',
					}),
				),
				languagePreference: t.Optional(
					t.String({
						description: 'Language preference for the chat response.',
					}),
				),
			}),
		},
	)
	.get(
		'/:threadId',
		async ({ params: { threadId }, query }) =>
			await getThreadMessages(threadId, {
				content: 'full',
				limit: query.limit,
				cursor: query.cursor,
			}),
		{
			detail: { summary: 'Read thread by ID (asc)' },
			params: t.Object({ threadId: t.String({ format: 'uuid' }) }),
			query: t.Object({
				cursor: t.Optional(
					t.Date({
						description:
							'Cursor for pagination, based on createdAt prop (creation date).',
					}),
				),
				limit: t.Number({
					default: 100,
					description: 'Limit for pagination.',
				}),
			}),
		},
	)
	.patch(
		'/:threadId',
		async ({ params: { threadId }, body, activeUser }) =>
			db
				.update(thread)
				.set(body)
				.where(and(eq(thread.id, threadId), eq(thread.userId, activeUser.id)))
				.returning({ id: thread.id }),
		{
			detail: { summary: 'Update thread by ID' },
			params: t.Object({ threadId: t.String({ format: 'uuid' }) }),
			body: t.Object({
				title: t.String({ minLength: 2, maxLength: 64 }),
			}),
		},
	)
	.delete(
		'/:threadId',
		async ({ params: { threadId }, activeUser }) =>
			db
				.delete(thread)
				.where(and(eq(thread.id, threadId), eq(thread.userId, activeUser.id)))
				.returning({ id: thread.id }),
		{
			detail: { summary: 'Delete thread by ID' },
			params: t.Object({ threadId: t.String({ format: 'uuid' }) }),
		},
	)
	.get(
		'/',
		async ({ query, activeUser }) =>
			db
				.select({
					id: thread.id,
					title: thread.title,
					createdAt: thread.createdAt,
				})
				.from(thread)
				.where(
					and(
						eq(thread.userId, activeUser.id),
						query.cursor && lt(thread.createdAt, query.cursor),
						query.search ? ilike(thread.title, `%${query.search}%`) : undefined,
					),
				)
				.limit(query.limit)
				.orderBy(desc(thread.createdAt)),
		{
			detail: { summary: 'List threads (desc)' },
			query: t.Object({
				cursor: t.Optional(
					t.Date({
						description:
							'Cursor for pagination, based on createdAt prop (creation date).',
					}),
				),
				limit: t.Number({
					default: 100,
					description: 'Limit for pagination.',
				}),
				search: t.Optional(
					t.String({
						description: 'Optional search query for thread title.',
					}),
				),
			}),
		},
	);
