import { Elysia } from 'elysia';
import { googleRouter } from './google';

export const authRouter = new Elysia({ prefix: '/auth' })
	.use(googleRouter)
	.post('/refresh-token', () => {});
