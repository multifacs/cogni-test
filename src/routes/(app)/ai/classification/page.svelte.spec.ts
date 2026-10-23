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

async function mountPage() {
	const screen = await render(Page);
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await new Promise((r) => setTimeout(r, 20));
	return screen;
}

async function addWord(word: string): Promise<void> {
	await userEvent.fill(page.getByTestId('word-input').first(), word);
	await userEvent.keyboard('{Enter}');
}

async function clickSubmit(): Promise<void> {
	await userEvent.click(page.getByRole('button', { name: 'Отправить' }));
	await vi.waitFor(() => {
		const error = document.querySelector('[data-testid="error"]');
		const thanks = document.body.textContent?.includes('Спасибо за прохождение!');
		if (!error && !thanks) throw new Error('submit ещё не завершился');
	});
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/ai/classification page', () => {
	it('рендерит задание, стимльный текст и инструкцию пересказа', async () => {
		const { container } = await mountPage();

		expect(container.textContent).toContain(CLASSIFICATION_INSTRUCTION);
		expect(container.textContent).toContain(CLASSIFICATION_TEXT);
		expect(container.textContent).toContain(RETELLING_INSTRUCTION);
		// одна группа при старте, лимит-кнопка «+» активна
		expect(container.querySelectorAll('[data-testid="group"]').length).toBe(1);
		expect(page.getByRole('button', { name: '+' })).toBeTruthy();
	});

	it('кнопка «+» добавляет новую группу', async () => {
		const { container } = await mountPage();

		await userEvent.click(page.getByRole('button', { name: '+' }));

		expect(container.querySelectorAll('[data-testid="group"]').length).toBe(2);
	});

	it('ввод слова и Enter — появляется чип-слово; слово из текста без пометки', async () => {
		const { container } = await mountPage();

		await addWord('пастух');

		const chips = container.querySelectorAll('[data-testid="word-chip"]');
		expect(chips.length).toBe(1);
		expect(chips[0].textContent).toContain('пастух');
		// «пастух» есть в тексте — невалидной пометки быть не должно
		expect(chips[0].classList.contains('invalid')).toBe(false);
		expect(container.querySelector('.invalid-dot')).toBeNull();
	});

	it('слово, отсутствующее в тексте, получает визуальную пометку, но не блокирует ввод', async () => {
		const { container } = await mountPage();

		await addWord('самолёт');

		const chip = container.querySelector('[data-testid="word-chip"]');
		expect(chip).not.toBeNull();
		expect(chip!.classList.contains('invalid')).toBe(true);
		const dot = container.querySelector('.invalid-dot');
		expect(dot?.getAttribute('title')).toBe('Слово не найдено в тексте');
	});

	it('удаление слова из группы и удаление группы', async () => {
		const { container } = await mountPage();

		await addWord('пастух');
		expect(container.querySelectorAll('[data-testid="word-chip"]').length).toBe(1);

		await userEvent.click(page.getByTestId('remove-word').first());
		expect(container.querySelectorAll('[data-testid="word-chip"]').length).toBe(0);

		await userEvent.click(page.getByRole('button', { name: '+' }));
		expect(container.querySelectorAll('[data-testid="group"]').length).toBe(2);

		await userEvent.click(page.getByTestId('remove-group').first());
		expect(container.querySelectorAll('[data-testid="group"]').length).toBe(1);
	});

	it('submit без единого слова — мягкая валидация, fetch не вызывается', async () => {
		const { container } = await mountPage();

		await clickSubmit();

		expect(fetchMock).not.toHaveBeenCalled();
		const error = container.querySelector('[data-testid="error"]');
		expect(error?.textContent).toContain('Добавьте хотя бы одно слово');
	});

	it('submit отправляет корректный JSON; 201 → экран благодарности и возврат в /ai', async () => {
		const { container } = await mountPage();

		await addWord('пастух');
		await userEvent.fill(page.getByTestId('feature-input').first(), 'Профессия');
		await userEvent.fill(
			page.getByTestId('retelling'),
			'Пастух нашёл в траве шкатулку с бусинкой'
		);

		fetchMock.mockResolvedValueOnce(jsonResponse(201, { ok: true, sessionId: 'abc' }));

		await clickSubmit();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/ai/classification');
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({
			groups: [{ words: ['пастух'], feature: 'Профессия' }],
			retelling: 'Пастух нашёл в траве шкатулку с бусинкой'
		});

		// 201 → экран благодарности
		expect(container.textContent).toContain('Спасибо за прохождение!');

		// возврат в меню ИИ
		await userEvent.click(page.getByRole('button', { name: '← Вернуться в меню' }));
		expect(navMocks.goto).toHaveBeenCalledWith('/ai');
	});

	it('401 → сообщение о необходимости перелогина, без экрана благодарности', async () => {
		const { container } = await mountPage();

		await addWord('шкатулка');
		fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Unauthorized' }));

		await clickSubmit();

		const error = container.querySelector('[data-testid="error"]');
		expect(error?.textContent).toContain('Сессия истекла');
		expect(container.textContent).not.toContain('Спасибо за прохождение!');
	});

	it('400 → инлайн-ошибка с возможностью повторить', async () => {
		const { container } = await mountPage();

		await addWord('шкатулка');
		fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'Invalid payload' }));

		await clickSubmit();

		const error = container.querySelector('[data-testid="error"]');
		expect(error?.textContent).toContain('Не удалось отправить ответ');
		// форма остаётся — можно повторить
		expect(container.textContent).toContain('Отправить');
	});

	it('ошибка сети → инлайн-ошибка, форма остаётся', async () => {
		const { container } = await mountPage();

		await addWord('шкатулка');
		fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await clickSubmit();

		const error = container.querySelector('[data-testid="error"]');
		expect(error?.textContent).toContain('Ошибка сети');
	});
});
