import { render, cleanup } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import {
	CLASSIFICATION_INSTRUCTION,
	CLASSIFICATION_TEXT,
	RETELLING_INSTRUCTION
} from '$lib/ai/classification-text';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
// (см. AGENTS.md: campimetry click-through)
import '../../../../app.css';

// ─── Хоистированные моки ─────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve())
}));

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

function jsonResponse(status: number, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function makeData(stage: 'words' | 'retelling' = 'words', sessionId: string | null = null) {
	return { stage, sessionId };
}

async function mountPage(data = makeData()) {
	const screen = await render(Page, { props: { data: data as never } });
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	return screen;
}

// В browser-режиме vi.useFakeTimers() по умолчанию подменяет в т.ч.
// requestAnimationFrame/queueMicrotask, на которых висит монтирование —
// ограничиваем набор только нужными таймерами.
const FAKE_TIMERS_OPTS = {
	toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] as (
		'setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval'
	)[]
};

/**
 * Монтирование этапа 1 с уже разблокированной кнопкой «Готово»:
 * fake timers → монтаж → промотка 30 с → возврат реальных таймеров
 * (userEvent/vi.waitFor требуют реальных таймеров).
 */
async function mountWordsUnlocked() {
	vi.useFakeTimers(FAKE_TIMERS_OPTS);
	const screen = await mountPage(makeData('words'));
	await vi.advanceTimersByTimeAsync(30_000);
	vi.useRealTimers();
	return screen;
}

function wordsDone(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('#words-done') as HTMLButtonElement;
}

function retellingDone(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('#retelling-done') as HTMLButtonElement;
}

async function addWord(word: string): Promise<void> {
	await userEvent.fill(page.getByTestId('word-input').first(), word);
	await userEvent.keyboard('{Enter}');
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/ai/classification — этап 1 (words)', () => {
	it('рендерит инструкцию, стимул и редактор групп; «Готово» заблокирована с отсчётом', async () => {
		const { container } = await mountPage(makeData('words'));

		expect(container.textContent).toContain(CLASSIFICATION_INSTRUCTION);
		expect(container.textContent).toContain(CLASSIFICATION_TEXT);
		expect(container.querySelectorAll('[data-testid="group"]').length).toBe(1);
		expect(page.getByTestId('word-input').first()).toBeTruthy();
		expect(page.getByRole('button', { name: '+' })).toBeTruthy();

		const btn = wordsDone(container);
		expect(btn.disabled).toBe(true);
		expect(btn.textContent).toContain('Готово (30 с)');
	});

	it('30-секундный отсчёт: disabled при t<30s, авто-активация при t≥30s', async () => {
		vi.useFakeTimers(FAKE_TIMERS_OPTS);
		const { container } = await mountPage(makeData('words'));

		expect(wordsDone(container).disabled).toBe(true);

		await vi.advanceTimersByTimeAsync(29_000);
		expect(wordsDone(container).disabled).toBe(true);
		expect(wordsDone(container).textContent).toContain('Готово (1 с)');

		await vi.advanceTimersByTimeAsync(1_000);
		expect(wordsDone(container).disabled).toBe(false);
		expect(wordsDone(container).textContent?.trim()).toBe('Готово');

		vi.useRealTimers();
	});

	it('cleanup: интервал отсчёта снимается при unmount (нет утечки таймера)', async () => {
		vi.useFakeTimers(FAKE_TIMERS_OPTS);
		await mountPage(makeData('words'));
		expect(vi.getTimerCount()).toBe(1);

		cleanup();
		expect(vi.getTimerCount()).toBe(0);

		vi.useRealTimers();
	});

	it('re-take: вход stage=words после завершённой истории = сознательный перезапуск (стимул рендерится, замок работает, POST слов)', async () => {
		// load больше никогда не отдаёт 'complete' (redirect удалён, Plan v4 Task 1.2):
		// завершивший пользователь приходит на 'words' и начинает НОВУЮ попытку.
		vi.useFakeTimers(FAKE_TIMERS_OPTS);
		const { container } = await mountPage(makeData('words'));

		// стимул доступен для новой попытки
		expect(container.querySelector('[data-testid="stimulus"]')).not.toBeNull();
		expect(container.textContent).toContain(CLASSIFICATION_TEXT);

		// 30-секундный замок работает как при первом входе
		const btn = wordsDone(container);
		expect(btn.disabled).toBe(true);
		expect(btn.textContent).toContain('Готово (30 с)');

		await vi.advanceTimersByTimeAsync(30_000);
		expect(wordsDone(container).disabled).toBe(false);
		vi.useRealTimers();

		// POST слов создаёт новую сессию попытки
		await addWord('пастух');
		fetchMock.mockResolvedValueOnce(jsonResponse(201, { ok: true, sessionId: 'sid-retake' }));

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="retelling"]')).not.toBeNull();
		});
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/ai/classification');
		expect(JSON.parse(String(init.body))).toEqual({
			groups: [{ words: ['пастух'], feature: '' }]
		});
	});

	it('клик по заблокированной кнопке не отправляет fetch', async () => {
		vi.useFakeTimers(FAKE_TIMERS_OPTS);
		const { container } = await mountPage(makeData('words'));

		// untrusted-клик: обработчик обязан игнорировать заблокированное состояние
		wordsDone(container).click();
		await vi.advanceTimersByTimeAsync(0);

		expect(fetchMock).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('клик «Готово» без слов — мягкая валидация, fetch не вызывается', async () => {
		const { container } = await mountWordsUnlocked();

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="error"]')).not.toBeNull();
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(container.querySelector('[data-testid="error"]')?.textContent).toContain(
			'Добавьте хотя бы одно слово'
		);
	});

	it('«Готово» после активации: POST слов → 201 → этап 2 без стимула в DOM', async () => {
		const { container } = await mountWordsUnlocked();

		await addWord('пастух');
		await userEvent.fill(page.getByTestId('feature-input').first(), 'Профессия');

		fetchMock.mockResolvedValueOnce(jsonResponse(201, { ok: true, sessionId: 'sid-1' }));

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="retelling"]')).not.toBeNull();
		});

		// payload этапа 1: только groups
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/ai/classification');
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({
			groups: [{ words: ['пастух'], feature: 'Профессия' }]
		});

		// стимул полностью отсутствует на этапе 2
		expect(container.querySelector('[data-testid="stimulus"]')).toBeNull();
		expect(container.textContent).not.toContain(CLASSIFICATION_TEXT);

		// редактор групп исчез, textarea пересказа появился
		expect(container.querySelector('[data-testid="group"]')).toBeNull();
		expect(container.textContent).toContain('Перескажите текст');
		expect(container.textContent).toContain(RETELLING_INSTRUCTION);
	});

	it('ошибка POST этапа 1 (500) — инлайн-сообщение, этап сохранён', async () => {
		const { container } = await mountWordsUnlocked();

		await addWord('шкатулка');
		fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'boom' }));

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="error"]')).not.toBeNull();
		});

		expect(container.querySelector('[data-testid="error"]')?.textContent).toContain(
			'Не удалось отправить ответ'
		);
		// этап не потерян: стимул и слова на месте, можно повторить
		expect(container.querySelector('[data-testid="stimulus"]')).not.toBeNull();
		expect(container.textContent).toContain('шкатулка');
	});
});

describe('/ai/classification — этап 2 (retelling)', () => {
	it('вход с props stage=retelling — сразу textarea, стимула нет, кнопка доступна без отсчёта', async () => {
		const { container } = await mountPage(makeData('retelling', 'sid-9'));

		expect(container.querySelector('[data-testid="stimulus"]')).toBeNull();
		expect(container.textContent).not.toContain(CLASSIFICATION_TEXT);
		expect(container.querySelector('[data-testid="retelling"]')).not.toBeNull();
		expect(container.textContent).toContain('Перескажите текст');
		expect(retellingDone(container).disabled).toBe(false);
		expect(retellingDone(container).textContent?.trim()).toBe('Готово');
		// редактор групп этапа 1 не рендерится
		expect(container.querySelector('[data-testid="group"]')).toBeNull();
	});

	it('«Готово» этапа 2: POST пересказа → «Спасибо» → переход в /ai', async () => {
		const { container } = await mountPage(makeData('retelling', 'sid-9'));

		await userEvent.fill(
			page.getByTestId('retelling'),
			'Пастух нашёл в траве малахитовую шкатулку'
		);

		fetchMock.mockResolvedValueOnce(jsonResponse(201, { ok: true }));

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.textContent).toContain('Спасибо за прохождение!');
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/ai/classification/retelling');
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({
			sessionId: 'sid-9',
			retelling: 'Пастух нашёл в траве малахитовую шкатулку'
		});

		// возврат в меню ИИ
		await userEvent.click(page.getByRole('button', { name: '← Вернуться в меню' }));
		expect(navMocks.goto).toHaveBeenCalledWith('/ai');
	});

	it('ошибка сети на этапе 2 — инлайн-сообщение, этап сохранён', async () => {
		const { container } = await mountPage(makeData('retelling', 'sid-9'));

		await userEvent.fill(page.getByTestId('retelling'), 'Пересказ');
		fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="error"]')).not.toBeNull();
		});

		expect(container.querySelector('[data-testid="error"]')?.textContent).toContain(
			'Ошибка сети'
		);
		// textarea остаётся с введённым текстом — можно повторить
		expect(container.querySelector('[data-testid="retelling"]')).not.toBeNull();
		expect(
			(container.querySelector('[data-testid="retelling"]') as HTMLTextAreaElement).value
		).toBe('Пересказ');
	});

	it('409 на этапе 2 — сообщение о повторном пересказе', async () => {
		const { container } = await mountPage(makeData('retelling', 'sid-9'));

		await userEvent.fill(page.getByTestId('retelling'), 'Пересказ');
		fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'already submitted' }));

		await userEvent.click(page.getByRole('button', { name: 'Готово' }));

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="error"]')).not.toBeNull();
		});

		expect(container.querySelector('[data-testid="error"]')?.textContent).toContain(
			'Пересказ для этой попытки уже отправлен'
		);
	});
});
