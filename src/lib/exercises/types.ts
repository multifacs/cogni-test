import type { AttentionResult } from './attention/types';
import type { EmojiResult } from './emoji/types';
import type { FlankerResult } from './flanker/types';
import type { LettersResult } from './letters/types';
import type { NumbersResult } from './numbers/types';
import type { PicturesResult } from './pictures/types';
import type { RavenFullResult } from './raven-matrices/types';

export type ExerciseType =
	| 'attention'
	| 'emoji'
	| 'flanker'
	| 'letters'
	| 'numbers'
	| 'pictures'
	| 'ravenMatrices';

export type ExerciseResultMap = {
	attention: AttentionResult;
	emoji: EmojiResult;
	flanker: FlankerResult;
	letters: LettersResult;
	numbers: NumbersResult;
	pictures: PicturesResult;
	ravenMatrices: RavenFullResult;
};

export type ExerciseResult =
	| AttentionResult
	| EmojiResult
	| FlankerResult
	| LettersResult
	| NumbersResult
	| PicturesResult
	| RavenFullResult;

export type ExerciseResults =
	| AttentionResult[]
	| EmojiResult[]
	| FlankerResult[]
	| LettersResult[]
	| NumbersResult[]
	| PicturesResult[]
	| RavenFullResult[];

export type ResultInfo = {
	sessionId: string;
	createdAt: string;
	attempts: ExerciseResults;
};

export interface MetaResult {
	results: ExerciseResults;
	meta: string[];
}
