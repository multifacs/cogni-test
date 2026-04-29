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

export function parseResult(attempts: RegularResults, name: TestType) {
	switch (name) {
		case 'stroop':
			return parseStroopResult(attempts as StroopResult[]);
	}
}

function parseStroopResult(attempts: StroopResult[]) {
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
		standardDeviationTimeOfAttemptBlue: 0,
	};

	let countRed = 0;
	let countBlue = 0;

	// TODO: think about how to handle this
	for (const result of attempts) {
		parsedResults['meanTimeOfAttempt'] += result.time;

		switch (result.color) {
			case 'red':
				countRed++;
				parsedResults['meanTimeOfAttemptRed'] += result.time;
				if (result.isCorrect) {
					parsedResults['correctnessRateRed']++;
				}
				break;
			case 'blue':
				countBlue++;
				parsedResults['meanTimeOfAttemptBlue'] += result.time;
				if (result.isCorrect) {
					parsedResults['correctnessRateBlue']++;
				}
				break;
		}

		if (result.isCorrect) {
			parsedResults['correctnessRate']++;
		}
	}
	parsedResults['meanTimeOfAttempt'] /= attempts.length;
	parsedResults['correctnessRate'] /= attempts.length;
	parsedResults['correctnessRateRed'] /= countRed;
	parsedResults['correctnessRateBlue'] /= countBlue;
	parsedResults['meanTimeOfAttemptRed'] /= countRed;
	parsedResults['meanTimeOfAttemptBlue'] /= countBlue;

    let standardDeviationTimeOfAttemptRed = 0;
    let standardDeviationTimeOfAttemptBlue = 0;
	// need mean to calculate variance, so there is another loop
	// actually, maybe not but I don't remember the formulas
	for (const result of attempts) {
		switch (result.color) {
			case 'red':
                standardDeviationTimeOfAttemptRed += Math.pow(
                    result.time - parsedResults['meanTimeOfAttemptRed'],
                    2
                );
				break;
			case 'blue':
                standardDeviationTimeOfAttemptBlue += Math.pow(
                    result.time - parsedResults['meanTimeOfAttemptBlue'],
                    2
                );
				break;
		}
		parsedResults['varianceTimeOfAttempt'] += Math.pow(
			result.time - parsedResults['meanTimeOfAttempt'],
			2
		);
	}
	parsedResults['varianceTimeOfAttempt'] /= attempts.length;
	parsedResults['standardDeviationTimeOfAttempt'] = Math.sqrt(
		parsedResults['varianceTimeOfAttempt']
	);

    standardDeviationTimeOfAttemptRed /= countRed;
    standardDeviationTimeOfAttemptBlue /= countBlue;
    parsedResults['standardDeviationTimeOfAttemptRed'] = Math.sqrt(
        standardDeviationTimeOfAttemptRed
    );
    parsedResults['standardDeviationTimeOfAttemptBlue'] = Math.sqrt(
        standardDeviationTimeOfAttemptBlue
    );

	return parsedResults;
}
