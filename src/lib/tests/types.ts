import type { StroopResult } from './stroop/types';
import type { MathResult } from './math/types';
import type { MunsterbergResult } from './munsterberg/types';
import type { MemoryResult } from './memory/types';
import type { SwallowResult } from './swallow/types';

export { type TestData } from './index';

export type TestResultMap = {
	math: MathResult;
	stroop: StroopResult;
	munsterberg: MunsterbergResult;
	memory: MemoryResult;
	swallow: SwallowResult;
	// campimetry: CampimetryResult;
	// можно добавлять дальше
};

export type ResultInfo<T extends keyof TestResultMap> = {
	sessionId: string;
	createdAt: string;
	attempts: TestResultMap[T][];
};

export type RegularResult<T extends keyof TestResultMap> = TestResultMap[T][];
export interface MetaResult<T extends keyof TestResultMap> {
	results: TestResultMap[T][];
	meta: string[];
}
