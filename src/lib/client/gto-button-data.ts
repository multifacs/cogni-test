import * as XLSX from 'xlsx';
import localforage from 'localforage';

// ─── Pure parsing ───────────────────────────────────────────────────

export function parseStimulusRow(cells: (string | number | undefined | null)[]): {
	avgReaction: number | null;
	accuracy: number | null;
} {
	let reactionsSum = 0;
	let incorrectReactionsCount = 0;
	let validCellsCount = 0;

	for (const cell of cells) {
		if (cell === null || cell === undefined) continue;

		if (typeof cell === 'number') {
			reactionsSum += cell;
			validCellsCount++;
			continue;
		}

		const str = String(cell).trim();
		if (str === '' || str === '-') {
			continue;
		}
		if (str.toLowerCase() === 'x') {
			incorrectReactionsCount++;
			validCellsCount++;
			continue;
		}

		const asNum = Number(str);
		if (!isNaN(asNum)) {
			reactionsSum += asNum;
			validCellsCount++;
		}
	}

	if (validCellsCount === 0) {
		return { avgReaction: null, accuracy: null };
	}

	return {
		avgReaction:
			validCellsCount > incorrectReactionsCount
				? reactionsSum / (validCellsCount - incorrectReactionsCount)
				: null,
		accuracy: (validCellsCount - incorrectReactionsCount) / validCellsCount
	};
}

// ─── Data structures ──────────────────────────────────────────────────

export type ButtonParticipantResult = {
	buttonId: number;
	avgReaction: number | null;
	accuracy: number | null;
};

export type ParsedButtonFile = {
	fileNumber: string;
	hand: 'left' | 'right';
	participants: ButtonParticipantResult[];
	uploadedAt: number;
};

export type StoredButtonPair = {
	left: ParsedButtonFile;
	right: ParsedButtonFile;
};

export type FileNumberStatus = {
	fileNumber: string;
	hasLeft: boolean;
	hasRight: boolean;
};

// ─── Localforage store ───────────────────────────────────────────────

const buttonStore = localforage.createInstance({ name: 'gto-buttons' });

// ─── Parse a single file from ArrayBuffer ────────────────────────────

export function parseButtonFile(
	buffer: ArrayBuffer,
	fileNumber: string,
	hand: 'left' | 'right'
): ParsedButtonFile {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

	const participants: ButtonParticipantResult[] = [];

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
	}

	return { fileNumber, hand, participants, uploadedAt: Date.now() };
}

// ─── Upload helpers ──────────────────────────────────────────────────

export async function uploadButtonFiles(fileList: FileList): Promise<FileNumberStatus[]> {
	const filenameRegex = /^(.+)([лп])\.xlsx?$/i;

	for (const file of fileList) {
		const match = file.name.match(filenameRegex);
		if (!match) {
			console.warn(`Skipping file with unexpected name: ${file.name}`);
			continue;
		}

		const fileNumber = match[1];
		const hand = match[2].toLowerCase() === 'л' ? 'left' : 'right';

		const buffer = await file.arrayBuffer();
		const parsed = parseButtonFile(buffer, fileNumber, hand);

		const key = `gto-button-${fileNumber}`;
		const existing: StoredButtonPair | null = await buttonStore.getItem(key);
		const pair: StoredButtonPair = existing ?? {
			left: { fileNumber, hand: 'left', participants: [], uploadedAt: 0 },
			right: { fileNumber, hand: 'right', participants: [], uploadedAt: 0 }
		};
		pair[hand] = parsed;
		await buttonStore.setItem(key, pair);
	}

	return getFileNumbersWithStatus();
}

// ─── Query functions ──────────────────────────────────────────────────

export async function getAvailableFileNumbers(): Promise<string[]> {
	const keys: string[] = [];
	await buttonStore.iterate((_, key) => {
		if (key.startsWith('gto-button-')) keys.push(key);
	});

	const complete: string[] = [];
	for (const key of keys) {
		const pair: StoredButtonPair | null = await buttonStore.getItem(key);
		if (pair && pair.left?.participants?.length > 0 && pair.right?.participants?.length > 0) {
			const fileNumber = key.replace('gto-button-', '');
			complete.push(fileNumber);
		}
	}
	complete.sort((a, b) => a.localeCompare(b));
	return complete;
}

export async function getFileNumbersWithStatus(): Promise<FileNumberStatus[]> {
	const keys: string[] = [];
	await buttonStore.iterate((_, key) => {
		if (key.startsWith('gto-button-')) keys.push(key);
	});

	const results: FileNumberStatus[] = [];
	for (const key of keys) {
		const pair: StoredButtonPair | null = await buttonStore.getItem(key);
		if (!pair) continue;
		const fileNumber = key.replace('gto-button-', '');
		results.push({
			fileNumber,
			hasLeft: pair.left?.participants?.length > 0,
			hasRight: pair.right?.participants?.length > 0
		});
	}
	results.sort((a, b) => a.fileNumber.localeCompare(b.fileNumber));
	return results;
}

export async function getParticipantIdsForFile(fileNumber: string): Promise<number[]> {
	const key = `gto-button-${fileNumber}`;
	const pair: StoredButtonPair | null = await buttonStore.getItem(key);
	if (!pair || !pair.left || !pair.right) return [];

	const idSet = new Set<number>();
	for (const p of [...pair.left.participants, ...pair.right.participants]) {
		idSet.add(p.buttonId);
	}
	return Array.from(idSet).sort((a, b) => a - b);
}

export async function getResultForParticipant(
	fileNumber: string,
	buttonId: number
): Promise<{ left: ButtonParticipantResult | null; right: ButtonParticipantResult | null }> {
	const key = `gto-button-${fileNumber}`;
	const pair: StoredButtonPair | null = await buttonStore.getItem(key);
	if (!pair) return { left: null, right: null };

	return {
		left: pair.left
			? (pair.left.participants.find((p) => p.buttonId === buttonId) ?? null)
			: null,
		right: pair.right
			? (pair.right.participants.find((p) => p.buttonId === buttonId) ?? null)
			: null
	};
}

export async function clearAllButtonData(): Promise<void> {
	const keys: string[] = [];
	await buttonStore.iterate((_, key) => {
		if (key.startsWith('gto-button-')) keys.push(key);
	});

	for (const key of keys) {
		await buttonStore.removeItem(key);
	}
}

export async function loadAllButtonData(): Promise<Map<string, StoredButtonPair>> {
	const map = new Map<string, StoredButtonPair>();
	await buttonStore.iterate((value, key) => {
		if (key.startsWith('gto-button-')) {
			const fileNumber = key.replace('gto-button-', '');
			map.set(fileNumber, value as StoredButtonPair);
		}
	});
	return map;
}
