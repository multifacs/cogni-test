import type { StroopResult } from './stroop/types';
import type { MathResult } from './math/types';

export { type TestData } from './index';

export type TestResultMap = {
	stroop: StroopResult;
	math: MathResult;
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
