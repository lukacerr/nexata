import type { Static } from '@sinclair/typebox';
import { jsonSchema, tool } from 'ai';
import { t } from 'elysia';

const GmailInput = t.Object({
	query: t.String({
		description: 'The search query to find relevant emails in Gmail.',
	}),
});

type GmailInput = Static<typeof GmailInput>;

export const gmailTool = tool({
	description: 'Gmail tool to return amount of references and files found',
	inputSchema: jsonSchema<GmailInput>(GmailInput),
	execute: async (req) => {
		return { references: 3, files: 2 };
	},
});
