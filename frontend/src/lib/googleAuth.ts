const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const HAS_GOOGLE_OAUTH =
	GOOGLE_CLIENT_ID.length > 0 &&
	GOOGLE_CLIENT_ID !== 'dummy-client-id' &&
	!GOOGLE_CLIENT_ID.startsWith('local-');

export const GOOGLE_OAUTH_CLIENT_ID = GOOGLE_CLIENT_ID || 'dummy-client-id';
