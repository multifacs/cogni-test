import type { StroopResult } from './stroop/types';
import type { MathResult } from './math/types';
import type { MunsterbergResult } from './munsterberg/types';
import type { MemoryResult } from './memory/types';
import type { SwallowResult } from './swallow/types';
import type { CampimetryResult } from './campimetry/types';
import type { RavenFullResult } from '$lib/exercises/raven-matrices/types';

export { type TestData } from './index';

export type TestType =
	| 'math'
	| 'stroop'
	| 'munsterberg'
	| 'memory'
	| 'swallow'
	| 'campimetry'
	| 'ravenMatrices';

export type TestResultMap = {
	math: MathResult;
	stroop: StroopResult;
	munsterberg: MunsterbergResult;
	memory: MemoryResult;
	swallow: SwallowResult;
	campimetry: CampimetryResult;
	ravenMatrices: RavenFullResult;
};

export type RegularResult =
	| StroopResult
	| MathResult
	| MunsterbergResult
	| MemoryResult
	| SwallowResult
	| CampimetryResult;

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
