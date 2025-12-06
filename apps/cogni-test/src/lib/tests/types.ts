import type { StroopResult } from './stroop/types';
import type { MathResult } from './math/types';
import type { MunsterbergResult } from './munsterberg/types';
import type { MemoryResult } from './memory/types';
import type { SwallowResult } from './swallow/types';
import type { CampimetryResult } from './campimetry/types';
import type { RhythmResult } from './rhythm/types';

export { type TestData } from './index';

export type TestResultMap = {
	math: MathResult;
	stroop: StroopResult;
	munsterberg: MunsterbergResult;
	memory: MemoryResult;
	swallow: SwallowResult;
	campimetry: CampimetryResult;
	rhythm: RhythmResult;
	// можно добавлять дальше
};

export type TestType =
	| 'math'
	| 'stroop'
	| 'munsterberg'
	| 'memory'
	| 'swallow'
	| 'campimetry'
	| 'rhythm';

export type RegularResult =
	| StroopResult
	| MathResult
	| MunsterbergResult
	| MemoryResult
	| SwallowResult
	| CampimetryResult
	| RhythmResult;

export type RegularResults =
	| StroopResult[]
	| MathResult[]
	| MunsterbergResult[]
	| MemoryResult[]
	| SwallowResult[]
	| CampimetryResult[];

export type ResultInfo = {
	sessionId: string;
	createdAt: string;
	attempts: RegularResults;
};

export interface MetaResult {
	results: RegularResults;
	meta: string[];
}

export type MemoryMatchResult = {
	attempt: number; // этап (1..3)
	time: number; // ms = durationMs
	stage: number; // дублируем attempt для совместимости с графиками
	cards: number; // rows*cols
	flips: number; // flipsCount
	mistakes: number; // mistakes
	efficiency: number; // flips / cards
	isCorrect: boolean; // всегда true (это не «прав/неправ», а «этап завершён»)
};
