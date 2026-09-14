/** Map exercise slug to the testType stored in the DB session table (mirrors the exercises playground POST writer). */
export const exerciseToSessionType: Record<string, string> = {
	'word-morphing': 'wordMorphingExercise',
	campimetry: 'campimetryExercise',
	'memory-match': 'memoryMatchExercise',
	'nback-stream': 'nbackExercise',
	'raven-matrices': 'ravenMatrices',
	emoji: 'emoji',
	attention: 'attention',
	pictures: 'pictures',
	numbers: 'numbers',
	flanker: 'flanker',
	letters: 'letters',
	rhythm: 'rhythm'
};
