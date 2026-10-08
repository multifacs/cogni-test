import type { AttentionTrialRow } from './attention/types';
import type { CampimetryResult } from '$lib/tests/campimetry/types';
import type { DotPositionResult } from './dot-position/types';
import type { EmojiTrialRow } from './emoji/types';
import type { FlankerTrialRow } from './flanker/types';
import type { LettersTrialRow } from './letters/types';
import type { MemoryMatchSummaryRow } from './memory-match/types';
import type { NBackTrialRow } from './nback-stream/types';
import type { NumbersTrialRow } from './numbers/types';
import type { OrigamiAttemptRow } from './origami/types';
import type { PicturesTrialRow } from './pictures/types';
import type { RavenAttemptRow } from './raven-matrices/types';
import type { RotationAttemptRow } from './rotation/results-adapter';
import type { WordMorphingSummaryRow } from './word-morphing/types';
import type { RhythmResult } from './rhythm/types';

export type ExerciseType =
	| 'attention'
	| 'campimetryExercise'
	| 'dotPosition'
	| 'emoji'
	| 'flanker'
	| 'letters'
	| 'memoryMatchExercise'
	| 'nbackExercise'
	| 'numbers'
	| 'origamiExercise'
	| 'pictures'
	| 'ravenMatrices'
	| 'rotation'
	| 'wordMorphingExercise'
	| 'rhythm';

export type ExerciseResultMap = {
	attention: AttentionTrialRow;
	campimetryExercise: CampimetryResult;
	dotPosition: DotPositionResult;
	emoji: EmojiTrialRow;
	flanker: FlankerTrialRow;
	letters: LettersTrialRow;
	memoryMatchExercise: MemoryMatchSummaryRow;
	nbackExercise: NBackTrialRow;
	numbers: NumbersTrialRow;
	origamiExercise: OrigamiAttemptRow;
	pictures: PicturesTrialRow;
	ravenMatrices: RavenAttemptRow;
	rotation: RotationAttemptRow;
	wordMorphingExercise: WordMorphingSummaryRow;
	rhythm: RhythmResult;
};

export type ExerciseResult =
	| AttentionTrialRow
	| CampimetryResult
	| DotPositionResult
	| EmojiTrialRow
	| FlankerTrialRow
	| LettersTrialRow
	| MemoryMatchSummaryRow
	| NBackTrialRow
	| NumbersTrialRow
	| OrigamiAttemptRow
	| PicturesTrialRow
	| RavenAttemptRow
	| RotationAttemptRow
	| WordMorphingSummaryRow
	| RhythmResult;

export type ExerciseResults =
	| AttentionTrialRow[]
	| CampimetryResult[]
	| DotPositionResult[]
	| EmojiTrialRow[]
	| FlankerTrialRow[]
	| LettersTrialRow[]
	| MemoryMatchSummaryRow[]
	| NBackTrialRow[]
	| NumbersTrialRow[]
	| OrigamiAttemptRow[]
	| PicturesTrialRow[]
	| RavenAttemptRow[]
	| RotationAttemptRow[]
	| WordMorphingSummaryRow[]
	| RhythmResult[];

export type ResultInfo = {
	sessionId: string;
	createdAt: string;
	attempts: ExerciseResults;
};

export interface MetaResult {
	results: ExerciseResults;
	meta: Record<string, string>;
}
