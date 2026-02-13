import type { GtoSession, GtoProfile } from './types';

export function newGtoSession(
	userId: string,
	adminId: string,
	profile: GtoProfile = 'main'
): GtoSession {
	switch (profile) {
		case 'main':
			return {
				userId,
				adminId,
				profile,
				tests: ['stroop', 'math', 'campimetry', 'swallow']
			};

		default: // by default create a main profile session
			return {
				userId,
				adminId,
				profile,
				tests: ['stroop', 'math', 'campimetry', 'swallow']
			};
	}
}
