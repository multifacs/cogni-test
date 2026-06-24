import type { AttentionResult } from './attention/types';
import type { CampimetryResult } from './campimetry/types';
import type { EmojiTrialRow } from './emoji/types';
import type { FlankerResult } from './flanker/types';
import type { LettersResult } from './letters/types';
import type { MemoryMatchSummaryRow } from './memory-match/types';
import type { NBackSummaryRow } from './nback-stream/types';
import type { NumbersResult } from './numbers/types';
import type { PicturesResult } from './pictures/types';
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
	flanker: FlankerResult;
	letters: LettersResult;
	memoryMatchExercise: MemoryMatchSummaryRow;
	nbackExercise: NBackSummaryRow;
	numbers: NumbersResult;
	pictures: PicturesResult;
	ravenMatrices: RavenAttemptRow;
	wordMorphingExercise: WordMorphingSummaryRow;
};

export type ExerciseResult =
	| AttentionResult
	| CampimetryResult
	| EmojiTrialRow
	| FlankerResult
	| LettersResult
	| MemoryMatchSummaryRow
	| NBackSummaryRow
	| NumbersResult
	| PicturesResult
	| RavenAttemptRow
	| WordMorphingSummaryRow;

export type ExerciseResults =
	| AttentionResult[]
	| CampimetryResult[]
	| EmojiTrialRow[]
	| FlankerResult[]
	| LettersResult[]
	| MemoryMatchSummaryRow[]
	| NBackSummaryRow[]
	| NumbersResult[]
	| PicturesResult[]
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
