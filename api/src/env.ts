export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const requireEnv = (key: string): string =>
	process.env[key] ||
	(() => {
		throw new Error(`${key} is not defined`);
	})();

export const warnEnv = (key: string): string => {
	const value = process.env[key];
	if (!value) {
		console.warn(`${key} is not defined`);
	}
	return value ?? '';
};

export const NEXATA_SECRET = requireEnv('NEXATA_SECRET');

export const CACHE_CREDENTIALS = {
	url: requireEnv('UPSTASH_REDIS_REST_URL'),
	token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
};

export const DATABASE_URL = requireEnv('DATABASE_URL');

export const DEPLOYMENT_URL = requireEnv('DEPLOYMENT_URL');
export const getOauthCallback = (key: string) =>
	`${DEPLOYMENT_URL}/auth/${key}/callback`;

export type Oauth2Credentials = [
	clientId: string,
	clientSecret: string,
	redirectURI: string,
];
