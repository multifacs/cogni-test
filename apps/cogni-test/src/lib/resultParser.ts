import type { CampimetryResult } from './tests/campimetry/types';
import type { MathResult } from './tests/math/types';
import type { StroopResult } from './tests/stroop/types';
import type { RegularResults, TestType } from './tests/types';

type ParsedStroopResult = {
	meanTimeOfAttempt: number;
	varianceTimeOfAttempt: number;
	standardDeviationTimeOfAttempt: number;
	correctnessRate: number;
	correctnessRateRed: number;
	correctnessRateBlue: number;
	meanTimeOfAttemptRed: number;
	meanTimeOfAttemptBlue: number;
	standardDeviationTimeOfAttemptRed: number;
	standardDeviationTimeOfAttemptBlue: number;
};

type ParsedMathResult = {
	meanTimeOfAttempt: number;
	varianceTimeOfAttempt: number;
	standardDeviationTimeOfAttempt: number;
	correctnessRate: number;
	correctnessRateOnTrue: number;
	correctnessRateOnFalse: number;
	standardDeviationTimeOfAttemptOnTrue: number;
	standardDeviationTimeOfAttemptOnFalse: number;
	meanTimeOfAttemptOnTrue: number;
	meanTimeOfAttemptOnFalse: number;
};

type ParsedCampimetryResult = {
	meanTimeFirstStage: number;
	meanTimeSecondStage: number;
	varianceFirstStage: number;
	varianceSecondStage: number;
	stddevFirstStage: number;
	stddevSecondStage: number;
	meanNumClicksFirstStage: number;
	meanDeltaUnderSecondStage: number;
	meanDeltaOverSecondStage: number;
	correctnessRateSecondStage: number;
};

export function parseResult(attempts: RegularResults, name: TestType) {
	switch (name) {
		case 'stroop':
			return parseStroopResults(attempts as StroopResult[]);
		case 'math':
			return parseMathResults(attempts as MathResult[]);
		case 'campimetry':
			return parseCampimetryResults(attempts as CampimetryResult[]);
	}
}

function parseStroopResults(attempts: StroopResult[]) {
	let parsedResults: ParsedStroopResult = {
		meanTimeOfAttempt: 0,
		varianceTimeOfAttempt: 0,
		standardDeviationTimeOfAttempt: 0,
		correctnessRate: 0,
		correctnessRateRed: 0,
		correctnessRateBlue: 0,
		meanTimeOfAttemptRed: 0,
		meanTimeOfAttemptBlue: 0,
		standardDeviationTimeOfAttemptRed: 0,
		standardDeviationTimeOfAttemptBlue: 0
	};

	const redResults = attempts.filter((res) => {
		res.color === 'red';
	});
	const blueResults = attempts.filter((res) => {
		res.color === 'blue';
	});

	parsedResults['meanTimeOfAttempt'] = calculateMean(attempts.map((result) => result.time));

	let { variance, stddev } = calculateVarianceAndStddev(
		attempts.map((result) => result.time),
		parsedResults['meanTimeOfAttempt']
	);
	parsedResults['varianceTimeOfAttempt'] = variance;
	parsedResults['standardDeviationTimeOfAttempt'] = stddev;

	const correctnessRate = attempts.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults['correctnessRate'] = correctnessRate;

	const correctnessRateRed = redResults.filter((res) => res.isCorrect).length / attempts.length;
	const correctnessRateBlue = blueResults.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults['correctnessRateRed'] = correctnessRateRed;
	parsedResults['correctnessRateBlue'] = correctnessRateBlue;

	const meanRed = calculateMean(redResults.map((res) => res.time));
	const meanBlue = calculateMean(blueResults.map((res) => res.time));

	parsedResults['meanTimeOfAttemptRed'] = meanRed;
	parsedResults['meanTimeOfAttemptBlue'] = meanBlue;

	parsedResults['standardDeviationTimeOfAttemptRed'] = calculateVarianceAndStddev(
		redResults.map((res) => res.time),
		meanRed
	).stddev;
	parsedResults['standardDeviationTimeOfAttemptBlue'] = calculateVarianceAndStddev(
		blueResults.map((res) => res.time),
		meanBlue
	).stddev;

	return parsedResults;
}

function parseMathResults(attempts: MathResult[]) {
	let parsedResults: ParsedMathResult = {
		meanTimeOfAttempt: 0,
		varianceTimeOfAttempt: 0,
		standardDeviationTimeOfAttempt: 0,
		correctnessRate: 0,
		correctnessRateOnTrue: 0,
		correctnessRateOnFalse: 0,
		standardDeviationTimeOfAttemptOnTrue: 0,
		standardDeviationTimeOfAttemptOnFalse: 0,
		meanTimeOfAttemptOnTrue: 0,
		meanTimeOfAttemptOnFalse: 0
	};

	const trueResults = attempts.filter((res) => res.correctAnswer === true);
	const falseResults = attempts.filter((res) => res.correctAnswer === false);

	parsedResults['meanTimeOfAttempt'] = calculateMean(attempts.map((res) => res.time));
	let { variance, stddev } = calculateVarianceAndStddev(
		attempts.map((result) => result.time),
		parsedResults['meanTimeOfAttempt']
	);
	parsedResults['varianceTimeOfAttempt'] = variance;
	parsedResults['standardDeviationTimeOfAttempt'] = stddev;

	const correctnessRate = attempts.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults['correctnessRate'] = correctnessRate;

	const correctnessRateTrue = trueResults.filter((res) => res.isCorrect).length / attempts.length;
	const correctnessRateFalse =
		falseResults.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults['correctnessRateOnTrue'] = correctnessRateTrue;
	parsedResults['correctnessRateOnFalse'] = correctnessRateFalse;

	const meanTrue = calculateMean(trueResults.map((res) => res.time));
	const meanFalse = calculateMean(falseResults.map((res) => res.time));

	parsedResults['meanTimeOfAttemptOnTrue'] = meanTrue;
	parsedResults['meanTimeOfAttemptOnFalse'] = meanFalse;

	parsedResults['standardDeviationTimeOfAttemptOnTrue'] = calculateVarianceAndStddev(
		trueResults.map((res) => res.time),
		meanTrue
	).stddev;
	parsedResults['standardDeviationTimeOfAttemptOnFalse'] = calculateVarianceAndStddev(
		falseResults.map((res) => res.time),
		meanFalse
	).stddev;

	return parsedResults;
}

function parseCampimetryResults(attempts: CampimetryResult[]) {
	let parsedResults: ParsedCampimetryResult = {
		meanTimeFirstStage: 0,
		meanTimeSecondStage: 0,
		varianceFirstStage: 0,
		varianceSecondStage: 0,
		stddevFirstStage: 0,
		stddevSecondStage: 0,
		meanNumClicksFirstStage: 0,
		meanDeltaUnderSecondStage: 0,
		meanDeltaOverSecondStage: 0,
		correctnessRateSecondStage: 0
	};

	const firstStageResults = attempts.filter((res) => res.stage == 1);
	const secondStageResults = attempts.filter((res) => res.stage == 2);

	parsedResults['meanTimeFirstStage'] = calculateMean(firstStageResults.map((res) => res.time));
	parsedResults['meanTimeSecondStage'] = calculateMean(secondStageResults.map((res) => res.time));

	let { variance, stddev } = calculateVarianceAndStddev(
		firstStageResults.map((res) => res.time),
		parsedResults['meanTimeFirstStage']
	);
	parsedResults['varianceFirstStage'] = variance;
	parsedResults['stddevFirstStage'] = stddev;

	let { variance: varianceSecondStage, stddev: stddevSecondStage } = calculateVarianceAndStddev(
		secondStageResults.map((res) => res.time),
		parsedResults['meanTimeSecondStage']
	);
	parsedResults['varianceSecondStage'] = varianceSecondStage;
	parsedResults['stddevSecondStage'] = stddevSecondStage;

	parsedResults['meanNumClicksFirstStage'] = calculateMean(
		firstStageResults.map((res) => res.delta)
	);
	parsedResults['meanDeltaUnderSecondStage'] = calculateMean(
		secondStageResults.filter((res) => res.delta > 0).map((res) => res.delta)
	);
	parsedResults['meanDeltaOverSecondStage'] = calculateMean(
		secondStageResults.filter((res) => res.delta < 0).map((res) => res.delta)
	);

	parsedResults['correctnessRateSecondStage'] =
		secondStageResults.reduce((acc, res) => acc + (res.delta == 0 ? 1 : 0), 0) /
		secondStageResults.length;
}

function calculateMean(array: number[]) {
	if (array.length === 0) {
		return 0;
	}

	return array.reduce((acc, value) => acc + value, 0) / array.length;
}

function calculateVarianceAndStddev(array: number[], mean: number) {
	if (array.length === 0) {
		return {
			variance: 0,
			stddev: 0
		};
	}

	let squaredDiffs = array.map((value) => Math.pow(value - mean, 2));
	let variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / array.length;
	let stddev = Math.sqrt(variance);

	return {
		variance,
		stddev
	};
}
