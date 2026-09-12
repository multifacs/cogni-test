import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<[(string | URL)?], Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<[string], string>((path: string) => path)
}));

const certMocks = vi.hoisted(() => ({
	downloadCertificatePdf: vi.fn<[], Promise<void>>(() => Promise.resolve())
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

function makeMetrics() {
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

function makeData(status: string) {
	return {
		session: {
			id: 'gto-1',
			name: 'Сессия ГТО',
			type: 'standard',
			status,
			createdAt: '2026-09-01 10:00:00',
			participants: []
		},
		metrics: makeMetrics()
	};
}

// ─── Хелперы ──────────────────────────────────────────────────────────

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
		HTMLButtonElement | undefined;
}

/**
 * Клик без actionability-ожидания: кнопка дизейблится синхронно в обработчике,
 * и trusted userEvent.click уходит в бесконечный retry по «неактивной мишени».
 * Untrusted-событие вызывает обработчик напрямую (см. MetricsDonutCard-спек).
 */
function clickButton(button: HTMLButtonElement): void {
	button.dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true }));
}

async function flushUpdate(): Promise<void> {
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	certMocks.downloadCertificatePdf.mockReset();
	certMocks.downloadCertificatePdf.mockReturnValue(Promise.resolve());
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/gto/session/[id]/results — сертификат', () => {
	it('renders certificate button when session status is completed', async () => {
		const { container } = await render(Page, { props: { data: makeData('completed') } });

		const button = findButtonByText(container, 'Скачать сертификат');
		expect(button).toBeTruthy();
		expect(button?.disabled).toBe(false);
	});

	it('does not render certificate button when session is not completed', async () => {
		const { container } = await render(Page, { props: { data: makeData('active') } });

		expect(findButtonByText(container, 'Скачать сертификат')).toBeUndefined();
		expect(container.textContent).not.toContain('Скачать сертификат');
	});

	it('disables button and shows progress text while PDF generation hangs', async () => {
		certMocks.downloadCertificatePdf.mockReturnValue(new Promise<void>(() => {}));
		// Чек-лист ревью: повисший fetch не должен разблокировать кнопку
		vi.stubGlobal('fetch', () => new Promise(() => {}));

		const { container } = await render(Page, { props: { data: makeData('completed') } });

		const button = findButtonByText(container, 'Скачать сертификат');
		expect(button).toBeTruthy();
		clickButton(button!);
		await flushUpdate();

		const busy = findButtonByText(container, 'Готовим PDF…');
		expect(busy?.disabled).toBe(true);
		expect(certMocks.downloadCertificatePdf).toHaveBeenCalledTimes(1);
	});

	it('shows alert with error message when PDF generation rejects', async () => {
		certMocks.downloadCertificatePdf.mockRejectedValue(new Error('rasterization failed'));

		const { container } = await render(Page, { props: { data: makeData('completed') } });

		const button = findButtonByText(container, 'Скачать сертификат');
		expect(button).toBeTruthy();
		clickButton(button!);

		await vi.waitFor(() => {
			const alert = container.querySelector('p[role="alert"]');
			expect(alert?.textContent).toContain('Не удалось сформировать сертификат');
		});

		// после ошибки кнопка снова активна
		const restored = findButtonByText(container, 'Скачать сертификат');
		expect(restored?.disabled).toBe(false);
	});
});
