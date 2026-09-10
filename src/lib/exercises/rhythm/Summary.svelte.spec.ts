import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Summary from './Summary.svelte';
import '../../../app.css';
import type { RhythmResult } from './types';

function makeSession(
	overrides: Partial<{
		sessionId: string;
		createdAt: string;
		attempts: RhythmResult[];
		meta: Record<string, string>;
		noMeta: boolean;
	}> = {}
) {
	return {
		sessionId: overrides.sessionId ?? 'sess-' + Math.random().toString(36).slice(2),
		createdAt: overrides.createdAt ?? new Date().toISOString(),
		attempts: overrides.attempts ?? [],
		...(overrides.noMeta ? {} : { meta: overrides.meta ?? {} })
	};
}

// tbody rows: 1 = «Дата и время», 2 = «Среднее отклонение», 3 = «Пережатия».
// td child indexes: easy = 2, medium = 3, hard = 4 (child 1 is the row th).
function cell(row: number, column: number): HTMLElement {
	const table = page.getByRole('table').element();
	return table.querySelector(`tbody tr:nth-child(${row}) td:nth-child(${column})`)!;
}

describe('Rhythm Summary', () => {
	it('picks best session by score and renders its date/values', async () => {
		// Session A: meanDeviation = 20ms, overpress = 0 => score = 20
		const sessionA = makeSession({
			createdAt: '2026-09-01T10:00:00.000Z',
			attempts: [
				{ attempt: 1000, note: 1020 },
				{ attempt: 2000, note: 1980 }
			],
			meta: { difficulty: 'easy', overpress: '0' }
		});
		// Session B: meanDeviation = 10ms, overpress = 0 => score = 10 (better)
		const sessionB = makeSession({
			createdAt: '2026-09-02T12:00:00.000Z',
			attempts: [
				{ attempt: 1000, note: 1010 },
				{ attempt: 3000, note: 2990 }
			],
			meta: { difficulty: 'easy', overpress: '0' }
		});

		await render(Summary, { props: { results: [sessionA, sessionB] } });

		// easy column (td 2) in the «Дата и время» row (tr 1) shows sessionB's date
		expect(cell(1, 2).textContent).toContain('02.09.2026');
		// easy column in the «Среднее отклонение» row (tr 2) shows the better deviation
		expect(cell(2, 2).textContent).toBe('10 мс');
	});

	it('renders «—» for difficulties without sessions', async () => {
		const session = makeSession({
			attempts: [{ attempt: 1000, note: 1000 }],
			meta: { difficulty: 'easy', overpress: '0' }
		});

		await render(Summary, { props: { results: [session] } });

		// medium (td 3) and hard (td 4) show «—» in every data row
		for (const row of [1, 2, 3]) {
			expect(cell(row, 3).textContent).toBe('—');
			expect(cell(row, 4).textContent).toBe('—');
		}
	});

	it('ignores sessions without meta.difficulty', async () => {
		const bad = makeSession({
			noMeta: true,
			attempts: [{ attempt: 1000, note: 1000 }]
		});
		const good = makeSession({
			createdAt: '2026-09-03T08:00:00.000Z',
			attempts: [{ attempt: 1500, note: 1500 }],
			meta: { difficulty: 'hard', overpress: '0' }
		});

		await render(Summary, { props: { results: [bad, good] } });

		// hard column shows the good session's date
		expect(cell(1, 4).textContent).toContain('03.09.2026');
		// the meta-less session is ignored everywhere: easy column stays empty
		expect(cell(1, 2).textContent).toBe('—');
	});

	it('labels overpress counts in the «Пережатия» row', async () => {
		const session = makeSession({
			createdAt: '2026-09-04T09:00:00.000Z',
			attempts: [{ attempt: 1000, note: 1000 }],
			meta: { difficulty: 'medium', overpress: '2' }
		});

		await render(Summary, { props: { results: [session] } });

		// medium column (td 3) in the «Пережатия» row (tr 3)
		expect(cell(3, 3).textContent).toBe('Пережатия: 2');
	});
});
