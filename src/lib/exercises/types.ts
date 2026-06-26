import type { AttentionTrialRow } from './attention/types';
import type { CampimetryResult } from './campimetry/types';
import type { EmojiTrialRow } from './emoji/types';
import type { FlankerTrialRow } from './flanker/types';
import type { LettersTrialRow } from './letters/types';
import type { MemoryMatchSummaryRow } from './memory-match/types';
import type { NBackTrialRow } from './nback-stream/types';
import type { NumbersTrialRow } from './numbers/types';
import type { PicturesTrialRow } from './pictures/types';
import type { RavenAttemptRow } from './raven-matrices/types';
import type { WordMorphingSummaryRow } from './word-morphing/types';

export type ExerciseType =
	| 'attention'
	| 'campimetryExercise'
	| 'emoji'
	| 'flanker'
	| 'letters'
	| 'memoryMatchExercise'
	| 'nbackExercise'
	| 'numbers'
	| 'pictures'
	| 'ravenMatrices'
	| 'wordMorphingExercise';

export type ExerciseResultMap = {
	attention: AttentionTrialRow;
	campimetryExercise: CampimetryResult;
	emoji: EmojiTrialRow;
	flanker: FlankerTrialRow;
	letters: LettersTrialRow;
	memoryMatchExercise: MemoryMatchSummaryRow;
	nbackExercise: NBackTrialRow;
	numbers: NumbersTrialRow;
	pictures: PicturesTrialRow;
	ravenMatrices: RavenAttemptRow;
	wordMorphingExercise: WordMorphingSummaryRow;
};

export type ExerciseResult =
	| AttentionTrialRow
	| CampimetryResult
	| EmojiTrialRow
	| FlankerTrialRow
	| LettersTrialRow
	| MemoryMatchSummaryRow
	| NBackTrialRow
	| NumbersTrialRow
	| PicturesTrialRow
	| RavenAttemptRow
	| WordMorphingSummaryRow;

export type ExerciseResults =
	| AttentionTrialRow[]
	| CampimetryResult[]
	| EmojiTrialRow[]
	| FlankerTrialRow[]
	| LettersTrialRow[]
	| MemoryMatchSummaryRow[]
	| NBackTrialRow[]
	| NumbersTrialRow[]
	| PicturesTrialRow[]
	| RavenAttemptRow[]
	| WordMorphingSummaryRow[];

export type ResultInfo = {
	sessionId: string;
	createdAt: string;
	attempts: ExerciseResults;
};

export interface MetaResult {
	results: ExerciseResults;
	meta: Record<string, string>;
}
