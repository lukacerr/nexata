import { cache, db } from '@api/env';
import { type MessageRole, message, thread } from '@api/schema';
import type { ModelMessage } from 'ai';
import { and, asc, eq, lt } from 'drizzle-orm';
import { HttpError } from 'elysia-logger';

export type getThreadMessagesOptions = {
	content: 'partial' | 'full';
	limit?: number;
	userId?: string;
	cursor?: Date;
	avoidCaching?: true;
};

type FullMessage = {
	id: string;
	role: MessageRole;
	content: unknown;
	extraReason: boolean;
	createdAt: Date;
};

export async function getThreadMessages(
	threadId: string,
	op: getThreadMessagesOptions & { content: 'partial' },
): Promise<ModelMessage[]>;

export async function getThreadMessages(
	threadId: string,
	op: getThreadMessagesOptions & { content: 'full' },
): Promise<FullMessage[]>;

export async function getThreadMessages(
	threadId: string,
	op: getThreadMessagesOptions,
) {
	if (op.content === 'partial') {
		const cached = await cache.get<ModelMessage[]>(threadId);
		if (cached) return cached;
	}

	const noncached = await db
		.select(
			op.content === 'partial'
				? { role: message.role, content: message.content }
				: {
						id: message.id,
						role: message.role,
						content: message.content,
						extraReason: message.extraReason,
						createdAt: message.createdAt,
					},
		)
		.from(message)
		.innerJoin(thread, eq(thread.id, message.threadId))
		.where(
			and(
				eq(message.threadId, threadId),
				op.userId ? eq(thread.userId, op.userId) : undefined,
				op.cursor && lt(message.createdAt, op.cursor),
			),
		)
		.limit(op.limit ?? 100)
		.orderBy(asc(message.createdAt));

	if (!noncached?.length) throw HttpError.NotFound('THREAD_NOT_FOUND');

	if (!op.avoidCaching)
		await cache.set<ModelMessage[]>(
			threadId,
			(op.content === 'full'
				? noncached.map((m) => ({
						role: m.role,
						content: m.content,
					}))
				: noncached) as ModelMessage[],
			{
				ex: 60 * 5,
			},
		);

	return noncached;
}
