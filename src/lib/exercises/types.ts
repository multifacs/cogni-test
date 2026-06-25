import type { AttentionResult } from './attention/types';
import type { CampimetryResult } from './campimetry/types';
import type { EmojiTrialRow } from './emoji/types';
import type { FlankerTrialRow } from './flanker/types';
import type { LettersTrialRow } from './letters/types';
import type { MemoryMatchSummaryRow } from './memory-match/types';
import type { NBackSummaryRow } from './nback-stream/types';
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
	attention: AttentionResult;
	campimetryExercise: CampimetryResult;
	emoji: EmojiTrialRow;
	flanker: FlankerTrialRow;
	letters: LettersTrialRow;
	memoryMatchExercise: MemoryMatchSummaryRow;
	nbackExercise: NBackSummaryRow;
	numbers: NumbersTrialRow;
	pictures: PicturesTrialRow;
	ravenMatrices: RavenAttemptRow;
	wordMorphingExercise: WordMorphingSummaryRow;
};

export type ExerciseResult =
	| AttentionResult
	| CampimetryResult
	| EmojiTrialRow
	| FlankerTrialRow
	| LettersTrialRow
	| MemoryMatchSummaryRow
	| NBackSummaryRow
	| NumbersTrialRow
	| PicturesTrialRow
	| RavenAttemptRow
	| WordMorphingSummaryRow;

export type ExerciseResults =
	| AttentionResult[]
	| CampimetryResult[]
	| EmojiTrialRow[]
	| FlankerTrialRow[]
	| LettersTrialRow[]
	| MemoryMatchSummaryRow[]
	| NBackSummaryRow[]
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
	meta: string[];
}
