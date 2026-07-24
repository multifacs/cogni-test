import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// ─── Pure parsing (copied from src/lib/client/gto-button-data.ts) ───

function parseStimulusRow(cells: (string | number | undefined | null)[]): {
	avgReaction: number | null;
	accuracy: number | null;
} {
	const totalStimuli = cells.length;
	if (totalStimuli === 0) {
		return { avgReaction: null, accuracy: null };
	}

	let reactionsSum = 0;
	let numericCellsCount = 0;
	let correctCount = 0;

	for (const cell of cells) {
		if (cell === null || cell === undefined) {
			continue;
		}

		if (typeof cell === 'number') {
			reactionsSum += cell;
			numericCellsCount++;
			correctCount++;
			continue;
		}

		const str = String(cell).trim();
		if (str === '-') {
			correctCount++;
			continue;
		}
		if (str.toLowerCase() === 'x' || str === '') {
			continue;
		}

		const asNum = Number(str);
		if (!isNaN(asNum)) {
			reactionsSum += asNum;
			numericCellsCount++;
			correctCount++;
		}
	}

	return {
		avgReaction: numericCellsCount > 0 ? reactionsSum / numericCellsCount : null,
		accuracy: correctCount / totalStimuli
	};
}

// ─── Data structures ──────────────────────────────────────────────────

type Hand = 'left' | 'right';

type ButtonParticipantResult = {
	buttonId: number;
	avgReaction: number | null;
	accuracy: number | null;
};

type ParsedButtonFile = {
	fileNumber: string;
	hand: Hand;
	participants: ButtonParticipantResult[];
};

type FullStimulusInfo = {
	buttonId: number;
	stimuli: string[];
	numericReactions: number[];
	correctOmissions: number;
	errors: number;
	empty: number;
	avgReaction: number | null;
	accuracy: number | null;
};

// ─── Parse a single file from file path ───────────────────────────────

function parseFile(filePath: string): {
	parsed: ParsedButtonFile;
	fullInfo: FullStimulusInfo[];
} | null {
	const buffer = fs.readFileSync(filePath);
	const workbook = XLSX.read(buffer, { type: 'buffer' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

	const filename = path.basename(filePath);
	const match = filename.match(/^(.+)([лп])\.xlsx?$/i);
	if (!match) {
		console.warn(`Предупреждение: имя файла не соответствует шаблону \u043B/\u043F: ${filename}`);
		return null;
	}
	const fileNumber = match[1];
	const hand: Hand = match[2].toLowerCase() === '\u043B' ? 'left' : 'right';

	const participants: ButtonParticipantResult[] = [];
	const fullInfo: FullStimulusInfo[] = [];

	for (let i = 3; i < rows.length; i++) {
		const row = rows[i];
		if (!Array.isArray(row) || row.length < 5) continue;
		const firstCell = row[0];
		if (firstCell === undefined || firstCell === null || firstCell === '') continue;
		const buttonId = Number(firstCell);
		if (isNaN(buttonId)) continue;

		const stimulusCells = row.slice(4) as (string | number | undefined | null)[];
		const { avgReaction, accuracy } = parseStimulusRow(stimulusCells);

		participants.push({ buttonId, avgReaction, accuracy });

		const stimuli: string[] = [];
		const numericReactions: number[] = [];
		let correctOmissions = 0;
		let errors = 0;
		let empty = 0;

		for (const cell of stimulusCells) {
			if (cell === null || cell === undefined) {
				stimuli.push('\u00D8');
				empty++;
				continue;
			}
			if (typeof cell === 'number') {
				stimuli.push(String(cell));
				numericReactions.push(cell);
				continue;
			}
			const str = String(cell).trim();
			if (str === '') {
				stimuli.push('\u00D8');
				empty++;
			} else if (str === '-') {
				stimuli.push('-');
				correctOmissions++;
			} else if (str.toLowerCase() === 'x') {
				stimuli.push('x');
				errors++;
			} else {
				stimuli.push(str);
				const asNum = Number(str);
				if (!isNaN(asNum)) {
					numericReactions.push(asNum);
				}
			}
		}

		fullInfo.push({ buttonId, stimuli, numericReactions, correctOmissions, errors, empty, avgReaction, accuracy });
	}

	if (participants.length === 0) {
		console.warn(`Предупреждение: нет валидных строк участников в файле ${filename}`);
	}

	return { parsed: { fileNumber, hand, participants }, fullInfo };
}

function formatSpeed(avgReaction: number | null): string {
	return avgReaction !== null && avgReaction !== undefined ? `${avgReaction.toFixed(2)} \u043C\u0441` : '\u2014';
}

function formatAccuracy(correctCount: number, total: number): string {
	const pct = total > 0 ? ((correctCount / total) * 100).toFixed(1) : '0.0';
	return `${correctCount}/${total} = ${pct}%`;
}

function printFileReport(filePath: string, parsed: ParsedButtonFile, fullInfo: FullStimulusInfo[]) {
	const filename = path.basename(filePath);
	const handLabel = parsed.hand === 'left' ? '\u043B\u0435\u0432\u0430\u044F \u0440\u0443\u043A\u0430' : '\u043F\u0440\u0430\u0432\u0430\u044F \u0440\u0443\u043A\u0430';
	console.log(`\u2550\u2550\u2550 \u0424\u0430\u0439\u043B: ${filename} (${handLabel}) \u2550\u2550\u2550`);

	if (fullInfo.length === 0) {
		console.log('  \u041D\u0435\u0442 \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432');
		console.log('');
		return;
	}

	for (const info of fullInfo) {
		 console.log(`  \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A ${info.buttonId}:`);
		 console.log(`    \u0421\u0442\u0438\u043C\u0443\u043B\u044B (${info.stimuli.length}): ${info.stimuli.join('  ')}`);
		 console.log(`    \u0427\u0438\u0441\u043B\u043E\u0432\u044B\u0435 \u0440\u0435\u0430\u043A\u0446\u0438\u0438: ${info.numericReactions.length}${info.numericReactions.length > 0 ? ' (' + info.numericReactions.join(', ') + ')' : ''}`);
		 console.log(`    \u0412\u0435\u0440\u043D\u044B\u0435 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0438 (-): ${info.correctOmissions}`);
		 console.log(`    \u041E\u0448\u0438\u0431\u043A\u0438 (x): ${info.errors}`);
		 console.log(`    \u041F\u0443\u0441\u0442\u044B\u0435: ${info.empty}`);
		 console.log(`    \u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C: ${formatSpeed(info.avgReaction)}`);
		 const correctCount = info.numericReactions.length + info.correctOmissions;
		 console.log(`    \u041A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0441\u0442\u044C: ${formatAccuracy(correctCount, info.stimuli.length)}`);
	}
	console.log('');
}

function printCombinedReport(fileNumber: string, left: FullStimulusInfo[], right: FullStimulusInfo[]) {
	console.log(`\u2550\u2550\u2550 \u0418\u0442\u043E\u0433\u043E \u0434\u043B\u044F \u0444\u0430\u0439\u043B\u0430 ${fileNumber} (\u043E\u0431\u0435 \u0440\u0443\u043A\u0438) \u2550\u2550\u2550`);

	const allIds = new Set<number>();
	for (const p of left) allIds.add(p.buttonId);
	for (const p of right) allIds.add(p.buttonId);
	const ids = Array.from(allIds).sort((a, b) => a - b);

	if (ids.length === 0) {
		console.log('  \u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445');
		console.log('');
		return;
	}

	for (const id of ids) {
		const l = left.find((p) => p.buttonId === id);
		const r = right.find((p) => p.buttonId === id);
		console.log(`  \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A ${id}:`);
		if (l) {
			const lCorrect = l.numericReactions.length + l.correctOmissions;
			console.log(`    \u041B\u0435\u0432\u0430\u044F:  \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C ${formatSpeed(l.avgReaction)}, \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0441\u0442\u044C ${((lCorrect / l.stimuli.length) * 100).toFixed(1)}%`);
		}
		if (r) {
			const rCorrect = r.numericReactions.length + r.correctOmissions;
			console.log(`    \u041F\u0440\u0430\u0432\u0430\u044F: \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C ${formatSpeed(r.avgReaction)}, \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0441\u0442\u044C ${((rCorrect / r.stimuli.length) * 100).toFixed(1)}%`);
		}
		if (l && r) {
			const lCorrect = l.numericReactions.length + l.correctOmissions;
			const rCorrect = r.numericReactions.length + r.correctOmissions;
			const totalCorrect = lCorrect + rCorrect;
			const totalStimuli = l.stimuli.length + r.stimuli.length;
			const pct = totalStimuli > 0 ? ((totalCorrect / totalStimuli) * 100).toFixed(1) : '0.0';
			console.log(`    \u041E\u0431\u0449\u0430\u044F \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0441\u0442\u044C: (${lCorrect}+${rCorrect})/(${l.stimuli.length}+${r.stimuli.length}) = ${pct}%`);
		}
	}
	console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error('\u041E\u0448\u0438\u0431\u043A\u0430: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0434\u0438\u043D \u0438\u043B\u0438 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0443\u0442\u0435\u0439 \u043A \u0444\u0430\u0439\u043B\u0430\u043C XLSX');
		process.exit(1);
	}

	const filesByNumber = new Map<string, { left?: { path: string; fullInfo: FullStimulusInfo[] }; right?: { path: string; fullInfo: FullStimulusInfo[] } }>();

	for (const filePath of args) {
		if (!fs.existsSync(filePath)) {
			console.error(`\u041E\u0448\u0438\u0431\u043A\u0430: \u0444\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${filePath}`);
			continue;
		}

		let result: { parsed: ParsedButtonFile; fullInfo: FullStimulusInfo[] } | null = null;
		try {
			result = parseFile(filePath);
		} catch (err) {
			console.error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0444\u0430\u0439\u043B\u0430 ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
			continue;
		}

		if (!result) continue;

		printFileReport(filePath, result.parsed, result.fullInfo);

		const entry = filesByNumber.get(result.parsed.fileNumber) ?? {};
		if (result.parsed.hand === 'left') {
			entry.left = { path: filePath, fullInfo: result.fullInfo };
		} else {
			entry.right = { path: filePath, fullInfo: result.fullInfo };
		}
		filesByNumber.set(result.parsed.fileNumber, entry);
	}

	for (const [fileNumber, entry] of filesByNumber) {
		if (entry.left && entry.right) {
			printCombinedReport(fileNumber, entry.left.fullInfo, entry.right.fullInfo);
		}
	}
}

main();
