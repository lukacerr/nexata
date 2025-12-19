import { cache, db } from '@api/data';
import { IS_PRODUCTION } from '@api/env';
import cors from '@elysiajs/cors';
import openapi from '@elysiajs/openapi';
import { opentelemetry } from '@elysiajs/opentelemetry';
import serverTiming from '@elysiajs/server-timing';
import { Elysia } from 'elysia';
import { helmet } from 'elysia-helmet';
import { httpExceptionPlugin } from 'elysia-http-exception';
import { authRouter } from './auth';

const app = new Elysia({ prefix: '/api' })
	.use(!IS_PRODUCTION && openapi({ path: '/docs' }))
	.use(IS_PRODUCTION && opentelemetry())
	.use(helmet())
	.use(serverTiming())
	.use(cors())
	.use(httpExceptionPlugin())
	.get('/', async () => ({
		timestamp: new Date().toISOString(),
		dbResponse: await db.execute('SELECT true'),
		cacheResponse: await cache.exec(['PING']),
	}))
	.use(authRouter)
	.listen(process.env.PORT ?? 3000);

export type App = typeof app;
