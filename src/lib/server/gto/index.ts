import * as XLSX from 'xlsx';
import fs from 'fs';
import type { ParticipantMetrics } from '$lib/server/db/controllers/gto';
import path from 'path';

const HEADERS = [
	[
		'ID',
		'Имя',
		'Возраст',
		'Средняя скорость Струпа Часть 2',
		'Корректность Струпа Часть 2',
		'Средняя скорость моторной реакции правая рука',
		'Корректность моторной реакции правая рука',
		'Средняя скорость моторной реакции левая рука',
		'Корректность моторной реакции левая рука',
		'Средняя скорость теста на память',
		'Корректность теста на память',
		'Средняя скорость теста «Ласточка»',
		'Время прохождения теста «Ласточка»',
		'Количество верных слов в «Последовательности слов»',
		'Метрика теста «Равновесие»',
		'Метрика теста «Лабиринт»',
		'Метрика теста Мюнстерберга',
		'Средняя скорость Струпа Часть 3',
		'Корректность Струпа Часть 3',
		'Средняя скорость теста «Матрица Равена»',
		'Корректность «Матриц Равена»',
		'Метрика «Логики»'
	]
];

const FILES_DIR = '/button-files/';
function isNumber(str: string) {
	return str.trim() !== '' && !isNaN(+str);
}

function parseButtonTestFile(filename: string) {
	let buf;
	try {
		const filepath = path.resolve(`static${FILES_DIR}${filename}`);
		console.log(filepath);
		buf = fs.readFileSync(filepath);
	} catch (e) {
		if (e instanceof Error) console.error(e.message);
		return {
			avgReaction: null,
			accuracy: null
		};
	}

	const workbook = XLSX.read(buf, { type: 'array' });

	let sheet = workbook.Sheets[workbook.SheetNames[0]];
	const raw_data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

	// TODO: there is some strong assumptions about format of the file
	// should probably either assert or do something smarter
	let relevantCells = raw_data[3].slice(4);

	let reactionsSum = 0;
	let incorrectReactionsCount = 0;
	let validCellsCount = 0;

	relevantCells.forEach((cell) => {
		if (cell === 'x') {
			incorrectReactionsCount++;
			validCellsCount++;
		} else if (isNumber(cell)) {
			reactionsSum += +cell;
			validCellsCount++;
		}
	});

	return {
		avgReaction: reactionsSum / validCellsCount,
		accuracy: (validCellsCount - incorrectReactionsCount) / validCellsCount
	};
}

export function getSpreadsheet(metrics: ParticipantMetrics[]) {
	const data = metrics.map((m) => {
		const leftFilename = `${m.editableMetrics.buttonTestFileName}л.xls`;
		const rightFilename = `${m.editableMetrics.buttonTestFileName}п.xls`;
		const { avgReaction: avgReactionLeft, accuracy: accuracyLeft } =
			parseButtonTestFile(leftFilename);
		const { avgReaction: avgReactionRight, accuracy: accuracyRight } =
			parseButtonTestFile(rightFilename);

		return {
			ID: m.participantId,
			Name: m.firstname,
			Age: m.age,
			StroopStage2MeanTime: m.stroop.stage2.meanTime,
			StroopStage2Accuracy: m.stroop.stage2.accuracy,
			AvgReactionLeft: avgReactionLeft,
			AccuracyLeft: accuracyLeft,
			AvgReactionRight: avgReactionRight,
			AccuracyRight: accuracyRight,
			MemoryMeanTime: m.memory.meanTime,
			MemoryAccuracy: m.memory.accuracy,
			SwallowMeanTime: m.swallow.meanTime,
			SwallowTotalTime: m.swallow.totalTime,
			WordScore: m.wordScore,
			BalanceTest: m.editableMetrics.balanceTest,
			Maze:
				(m.editableMetrics.mazeQ1 ?? 0) +
				(m.editableMetrics.mazeQ2 ?? 0) +
				(m.editableMetrics.mazeQ3 ?? 0),
			Munsterberg: m.munsterberg.fractionGuessed,
			StroopStage3MeanTime: m.stroop.stage3.meanTime,
			StroopStage3Accuracy: m.stroop.stage3.accuracy,
			RavenMeanTime: m.raven.averageResponseTimeMs,
			RavenAccuracy: m.raven.accuracy,
			Logic: m.editableMetrics.logic
		};
	});

	const worksheet = XLSX.utils.json_to_sheet(data);
	const workbook = XLSX.utils.book_new();

	XLSX.utils.sheet_add_aoa(worksheet, HEADERS, { origin: 'A1' });
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Результаты ГТО-М');
	return workbook;
}
