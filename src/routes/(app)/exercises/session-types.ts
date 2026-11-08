import { protocolTypes } from '$lib/exercises/protocol/config';
/** Map exercise slug to the testType stored in the DB session table (mirrors the exercises playground POST writer). */
export const exerciseToSessionType: Record<string, string> = {
	...Object.fromEntries(protocolTypes.map((name) => [name, name])),
	'word-morphing': 'wordMorphingExercise',
	campimetry: 'campimetryExercise',
	'memory-match': 'memoryMatchExercise',
	'nback-stream': 'nbackExercise',
	'raven-matrices': 'ravenMatrices',
	origami: 'origamiExercise',
	emoji: 'emoji',
	attention: 'attention',
	pictures: 'pictures',
	numbers: 'numbers',
	flanker: 'flanker',
	letters: 'letters',
	rhythm: 'rhythm',
	'dot-position': 'dotPosition',
	rotation: 'rotation',
	'corsi-block': 'corsiBlock',
	simon: 'simonTask',
	'syllable-formation': 'syllableFormation'
};
