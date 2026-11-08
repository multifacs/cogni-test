import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import type { PageProps } from './$types';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(url?: string | URL) => Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<(path: string) => string>((path: string) => path)
}));

const certMocks = vi.hoisted(() => ({
	downloadCertificatePdf: vi.fn<() => Promise<void>>(() => Promise.resolve())
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [(string | URL)?]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path)
}));

vi.mock('$lib/certificate/generate', () => ({
	downloadCertificatePdf: () => certMocks.downloadCertificatePdf()
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

function makeMetrics(): PageProps['data']['metrics'] {
	return {
		participantId: 'p1',
		userId: 'u1',
		firstname: 'Иван',
		lastname: 'Иванов',
		sex: 'male',
		age: 20,
		missingSurveyFields: [] as string[],
		stroop: {
			stage1: { meanTime: 1.5, stdDevTime: 0.2, accuracy: 0.9 },
			stage2: { meanTime: 1.7, stdDevTime: 0.3, accuracy: 0.8 },
			stage3: { meanTime: 2.0, stdDevTime: 0.4, accuracy: 0.7 }
		},
		math: { meanTime: 3.1, stdDevTime: 0.5, accuracy: 0.85 },
		munsterberg: { meanTime: 2.0, stdDevTime: 0.5, fractionGuessed: 0.6, totalWordsHidden: 20 },
		campimetry: {
			stage1: { meanTime: 0.8, stdDevTime: 0.1, meanDelta: 0.05 },
			stage2: { meanTime: 0.9, stdDevTime: 0.1, meanDelta: 0.07 },
			stage2Breakdown: { underPress: 1, exact: 2, overPress: 3 }
		},
		memory: { meanTime: 4.2, stdDevTime: 0.6, accuracy: 0.75 },
		swallow: { meanTime: 30, stdDevTime: 1, accuracy: 0.9, totalTime: 60 },
		raven: {
			totalQuestions: 12,
			correctCount: 8,
			accuracy: 0.66,
			averageResponseTimeMs: 5000,
			byDifficulty: {
				level1: { correct: 3, total: 4, accuracy: 0.75 },
				level2: { correct: 3, total: 4, accuracy: 0.75 },
				level3: { correct: 2, total: 4, accuracy: 0.5 }
			},
			byTaskClass: {} as Record<string, { correct: number; total: number; label: string }>
		},
		editableMetrics: {
			id: null,
			balanceTest: 'норма',
			mazeQ1: 1,
			mazeQ2: 2,
			mazeQ3: 3,
			mazeVRNumber: 4,
			mazeVRFileName: null,
			buttonTestNumber: 5,
			buttonTestFileName: null,
			logic: 6,
			wordSetNumber: 7
		},
		wordScore: 4,
		submittedWords: ['кот', 'дом']
	};
}

function makeData(status: PageProps['data']['session']['status']): PageProps['data'] {
	return {
		session: {
			id: 'gto-1',
			name: 'Сессия ГТО',
			type: 'standard',
			status,
			createdAt: '2026-09-01 10:00:00',
			participants: []
		},
		user: {
			id: 'u1',
			firstname: 'Иван',
			lastname: 'Ив',
			birthday: new Date('2000-01-01'),
			sex: 'male'
		},
		profileSurvey: { userId: 'u1', gtoId: 'GTO-123' },
		undiagnosed: false,
		allowedPaths: ['/gto'],
		isDevMode: false,
		metrics: makeMetrics()
	};
}

// ─── Хелперы ──────────────────────────────────────────────────────────

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
		HTMLButtonElement | undefined;
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/gto/session/[id]/results — сертификат', () => {
	it('marks certificate download as in development for a completed session', async () => {
		const { container } = await render(Page, {
			props: { data: makeData('completed'), params: { id: 'gto-1' }, form: null }
		});

		const button = findButtonByText(container, 'Скачать сертификат — в разработке');
		expect(button).toBeTruthy();
		expect(button?.disabled).toBe(true);
		expect(container.textContent).toContain('Скачивание сертификата пока недоступно');
		expect(container.textContent).not.toContain('Готовим PDF');
	});

	it('does not offer a certificate for an active session', async () => {
		const { container } = await render(Page, {
			props: { data: makeData('active'), params: { id: 'gto-1' }, form: null }
		});

		expect(findButtonByText(container, 'Скачать сертификат')).toBeUndefined();
		expect(container.textContent).not.toContain('Скачивание сертификата пока недоступно');
	});

	it('keeps results visible and never generates a PDF when download is unavailable', async () => {
		const { container } = await render(Page, {
			props: { data: makeData('completed'), params: { id: 'gto-1' }, form: null }
		});
		const button = findButtonByText(container, 'Скачать сертификат');
		expect(button).toBeTruthy();

		button!.click();
		// Даже синтетическое событие не должно обходить запрет скачивания.
		button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(certMocks.downloadCertificatePdf).not.toHaveBeenCalled();
		expect(button?.disabled).toBe(true);
		expect(container.querySelector('[role="alert"]')).toBeNull();
		expect(container.textContent).toContain('Последовательность слов');
		expect(container.textContent).toContain('Струп');
	});
});
