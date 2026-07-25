// ─── Pure parsing ───────────────────────────────────────────────────

export function parseStimulusRow(cells: (string | number | undefined | null)[]): {
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

// ─── Format helpers ─────────────────────────────────────────────────

export function formatSpeed(avgReaction: number | null): string {
	return avgReaction !== null && avgReaction !== undefined ? `${avgReaction.toFixed(2)} мс` : '—';
}

export function formatAccuracy(correctCount: number, total: number): string {
	const pct = total > 0 ? ((correctCount / total) * 100).toFixed(1) : '0.0';
	return `${correctCount}/${total} = ${pct}%`;
}

// ─── Data structures ──────────────────────────────────────────────────

export type Hand = 'left' | 'right';

export type ButtonParticipantResult = {
	buttonId: number;
	avgReaction: number | null;
	accuracy: number | null;
};

export type RawButtonParticipant = {
	buttonId: number;
	stimulusCells: (string | number | undefined | null)[];
};

export type ParsedButtonFile = {
	fileNumber: string;
	hand: Hand;
	participants: RawButtonParticipant[];
};

export function computeFromRaw(raw: RawButtonParticipant): ButtonParticipantResult {
	const { avgReaction, accuracy } = parseStimulusRow(raw.stimulusCells);
	return { buttonId: raw.buttonId, avgReaction, accuracy };
}

export type FullStimulusInfo = {
	buttonId: number;
	stimuli: string[];
	numericReactions: number[];
	correctOmissions: number;
	errors: number;
	empty: number;
	avgReaction: number | null;
	accuracy: number | null;
};
