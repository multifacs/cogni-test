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

		// best for easy should be sessionB (lower meanDeviation → lower score)
		const easyCard = page.getByRole('heading', { name: /Легкий/i }).element().closest('div')!;
		expect(easyCard.textContent).toContain('02.09.2026');
		expect(easyCard.textContent).toContain('10');
	});

	it('renders «Попыток нет» when no sessions for a difficulty', async () => {
		const session = makeSession({
			attempts: [{ attempt: 1000, note: 1000 }],
			meta: { difficulty: 'easy', overpress: '0' }
		});

		await render(Summary, { props: { results: [session] } });

		// medium and hard should have no attempts
		const mediumCard = page.getByRole('heading', { name: /Средний/i }).element().closest('div')!;
		const hardCard = page.getByRole('heading', { name: /Сложный/i }).element().closest('div')!;
		expect(mediumCard.textContent).toContain('Попыток нет');
		expect(hardCard.textContent).toContain('Попыток нет');
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

		// Hard card should show the good session
		const hardCard = page.getByRole('heading', { name: /Сложный/i }).element().closest('div')!;
		expect(hardCard.textContent).toContain('03.09.2026');
		// Bad session should not appear in any card; easy/medium remain empty
		const easyCard = page.getByRole('heading', { name: /Легкий/i }).element().closest('div')!;
		expect(easyCard.textContent).toContain('Попыток нет');
	});
});
