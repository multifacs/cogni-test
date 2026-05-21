import type { CampimetryResult } from '../tests/campimetry/types';
import type { MathResult } from '../tests/math/types';
import type { StroopResult } from '../tests/stroop/types';
import type { SwallowResult } from '../tests/swallow/types';
import type { RegularResults, TestType } from '../tests/types';

type ParsedStroopResult = {
	type: 'stroop';
	results: Record<string, number>; // заголовок - значение
};

type ParsedMathResult = {
	type: 'math';
	results: Record<string, number>; // заголовок - значение
};

type ParsedCampimetryResult = {
	type: 'campimetry';
	results: Record<string, number>; // заголовок - значение
};

type ParsedSwallowResult = {
	type: 'swallow';
	results: Record<string, number>; // заголовок - значение
};

// TODO: testing... fun...
// for whatever reason vitest can't find this function if not default exported
export default function parseResults(attempts: RegularResults, name: TestType) {
	switch (name) {
		case 'stroop':
			return parseStroopResults(attempts as StroopResult[]);
		case 'math':
			return parseMathResults(attempts as MathResult[]);
		case 'campimetry':
			return parseCampimetryResults(attempts as CampimetryResult[]);
		case 'swallow':
			return parseSwallowResults(attempts as SwallowResult[]);
		default:
			console.log('Not implemented for test type: ', name);
			return null;
	}
}

function parseStroopResults(attempts: StroopResult[]) {
	let parsedResults: ParsedStroopResult = {
		type: 'stroop',
		results: {}
	};

	const redResults = attempts.filter((res) => res.color === 'red');
	const blueResults = attempts.filter((res) => res.color === 'blue');

	parsedResults.results['Среднее время одной попытки'] = calculateMean(
		attempts.map((result) => result.time)
	);

	let { variance, stddev } = calculateVarianceAndStddev(
		attempts.map((result) => result.time),
		parsedResults.results['Среднее время одной попытки']
	);
	parsedResults.results['Вариабельность времени одной попытки (дисперсия)'] = variance;
	parsedResults.results['Среднее отклонение времени одной попытки'] = stddev;

	const correctnessRate = attempts.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults.results['Общая корректность'] = correctnessRate;

	const correctnessRateRed = redResults.filter((res) => res.isCorrect).length / redResults.length;
	const correctnessRateBlue =
		blueResults.filter((res) => res.isCorrect).length / blueResults.length;
	parsedResults.results['Корректность по красному цвету'] = correctnessRateRed;
	parsedResults.results['Корректность по синему цвету'] = correctnessRateBlue;

	const meanRed = calculateMean(redResults.map((res) => res.time));
	const meanBlue = calculateMean(blueResults.map((res) => res.time));

	parsedResults.results['Среднее время одной попытки по красному цвету'] = meanRed;
	parsedResults.results['Среднее время одной попытки по синему цвету'] = meanBlue;

	parsedResults.results['Среднее отклонение времени одной попытки по красному цвету'] =
		calculateVarianceAndStddev(
			redResults.map((res) => res.time),
			meanRed
		).stddev;
	parsedResults.results['Среднее отклонение времени одной попытки по синему цвету'] =
		calculateVarianceAndStddev(
			blueResults.map((res) => res.time),
			meanBlue
		).stddev;

	return parsedResults;
}

function parseMathResults(attempts: MathResult[]) {
	let parsedResults: ParsedMathResult = {
		type: 'math',
		results: {}
	};

	const trueResults = attempts.filter((res) => res.correctAnswer === true);
	const falseResults = attempts.filter((res) => res.correctAnswer === false);

	parsedResults.results['Среднее время одной попытки'] = calculateMean(
		attempts.map((res) => res.time)
	);
	let { variance, stddev } = calculateVarianceAndStddev(
		attempts.map((result) => result.time),
		parsedResults.results['Среднее время одной попытки']
	);
	parsedResults.results['Вариабельность времени одной попытки (дисперсия)'] = variance;
	parsedResults.results['Среднее отклонение времени одной попытки'] = stddev;

	const correctnessRate = attempts.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults.results['Общая корректность'] = correctnessRate;

	const correctnessRateTrue = trueResults.filter((res) => res.isCorrect).length / attempts.length;
	const correctnessRateFalse =
		falseResults.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults.results['Корректность по верным неравенствам'] = correctnessRateTrue;
	parsedResults.results['Корректность по неверным неравенствам'] = correctnessRateFalse;

	const meanTrue = calculateMean(trueResults.map((res) => res.time));
	const meanFalse = calculateMean(falseResults.map((res) => res.time));

	parsedResults.results['Среднее время одной попытки по верным неравенствам'] = meanTrue;
	parsedResults.results['Среднее отклонение времени одной попытки по верным неравенствам'] =
		calculateVarianceAndStddev(
			trueResults.map((res) => res.time),
			meanTrue
		).stddev;
	parsedResults.results['Среднее время одной попытки по неверным неравенствам'] = meanFalse;
	parsedResults.results['Среднее отклонение времени одной попытки по неверным неравенствам'] =
		calculateVarianceAndStddev(
			falseResults.map((res) => res.time),
			meanFalse
		).stddev;

	return parsedResults;
}

function parseCampimetryResults(attempts: CampimetryResult[]) {
	let parsedResults: ParsedCampimetryResult = {
		type: 'campimetry',
		results: {}
	};

	const firstStageResults = attempts.filter((res) => res.stage == 1);
	const secondStageResults = attempts.filter((res) => res.stage == 2);

	parsedResults.results['Среднее время одной попытки 1 этапа'] = calculateMean(
		firstStageResults.map((res) => res.time)
	);
	parsedResults.results['Среднее время одной попытки 2 этапа'] = calculateMean(
		secondStageResults.map((res) => res.time)
	);

	let { variance, stddev } = calculateVarianceAndStddev(
		firstStageResults.map((res) => res.time),
		parsedResults.results['Среднее время одной попытки 1 этапа']
	);
	parsedResults.results['Вариабельность времени одной попытки 1 этапа (дисперсия)'] = variance;
	parsedResults.results['Среднее отклонение времени одной попытки 1 этапа'] = stddev;

	let { variance: varianceSecondStage, stddev: stddevSecondStage } = calculateVarianceAndStddev(
		secondStageResults.map((res) => res.time),
		parsedResults.results['Среднее время одной попытки 2 этапа']
	);
	parsedResults.results['Вариабельность времени одной попытки 2 этапа (дисперсия)'] =
		varianceSecondStage;
	parsedResults.results['Среднее отклонение времени одной попытки 2 этапа'] = stddevSecondStage;

	parsedResults.results['Среднее количество нажатий по 1 этапу'] = calculateMean(
		firstStageResults.map((res) => res.delta)
	);

	parsedResults.results['Среднее отклонение (недожатий) 2 этапа'] = calculateMean(
		secondStageResults.filter((res) => res.delta > 0).map((res) => res.delta)
	);
	parsedResults.results['Среднее отклонение (пережатий) 2 этапа'] = calculateMean(
		secondStageResults.filter((res) => res.delta < 0).map((res) => res.delta)
	);

	parsedResults.results['Доля попаданий во 2 этапе'] =
		secondStageResults.reduce((acc, res) => acc + (res.delta == 0 ? 1 : 0), 0) /
		secondStageResults.length;

	return parsedResults;
}

function parseSwallowResults(attempts: SwallowResult[]) {
	let parsedResults: ParsedSwallowResult = {
		type: 'swallow',
		results: {}
	};

	const redResults = attempts.filter((res) => {
		res.background === 'red';
	});
	const blueResults = attempts.filter((res) => {
		res.background === 'blue';
	});

	parsedResults.results['Среднее время одной попытки'] = calculateMean(
		attempts.map((result) => result.time)
	);

	let { variance, stddev } = calculateVarianceAndStddev(
		attempts.map((result) => result.time),
		parsedResults.results['Среднее время одной попытки']
	);
	parsedResults.results['Вариабельность времени одной попытки (дисперсия)'] = variance;
	parsedResults.results['Среднее отклонение времени одной попытки'] = stddev;

	const correctnessRate = attempts.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults.results['Общая корректность'] = correctnessRate;

	const correctnessRateRed = redResults.filter((res) => res.isCorrect).length / attempts.length;
	const correctnessRateBlue = blueResults.filter((res) => res.isCorrect).length / attempts.length;
	parsedResults.results['Корректность по красному цвету'] = correctnessRateRed;
	parsedResults.results['Корректность по синему цвету'] = correctnessRateBlue;

	const meanRed = calculateMean(redResults.map((res) => res.time));
	const meanBlue = calculateMean(blueResults.map((res) => res.time));

	parsedResults.results['Среднее время одной попытки по красному цвету'] = meanRed;
	parsedResults.results['Среднее время одной попытки по синему цвету'] = meanBlue;

	parsedResults.results['Среднее отклонение времени одной попытки по красному цвету'] =
		calculateVarianceAndStddev(
			redResults.map((res) => res.time),
			meanRed
		).stddev;
	parsedResults.results['Среднее отклонение времени одной попытки по синему цвету'] =
		calculateVarianceAndStddev(
			blueResults.map((res) => res.time),
			meanBlue
		).stddev;

	return parsedResults;
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
