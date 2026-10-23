import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
// (см. AGENTS.md: campimetry click-through)
import '../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(target?: string | URL, opts?: unknown) => Promise<void>>(() => Promise.resolve()),
	url: new URL('http://localhost/ai/ai-life')
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (target?: string | URL, opts?: unknown) => navMocks.goto(target, opts)
}));

vi.mock('$app/state', () => ({
	// getter: navMocks.url можно переприсвоить между тестами ДО рендера
	page: {
		get url() {
			return navMocks.url;
		}
	}
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

const Q6_YES = 'Да, ежедневно';
const Q6_NO = 'Нет, не использую';

function makeData(
	overrides: {
		answers?: Record<string, unknown>;
		user?: { birthday: string | Date; sex: 'male' | 'female' } | null;
	} = {}
) {
	return {
		answers: overrides.answers ?? {},
		user:
			overrides.user === undefined
				? { birthday: new Date('2000-05-10T00:00:00.000Z'), sex: 'male' as const }
				: overrides.user
	};
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Хелперы ──────────────────────────────────────────────────────────

async function mountPage(data: ReturnType<typeof makeData> = makeData(), search = '') {
	navMocks.url = new URL(`http://localhost/ai/ai-life${search}`);
	const result = await render(Page, { props: { data: data as never } });
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await sleep(50);
	return result;
}

/** input внутри label, содержащего точный текст варианта. */
function inputForLabel(container: HTMLElement, labelText: string): HTMLInputElement | null {
	const labels = [...container.querySelectorAll('label')];
	const label = labels.find((l) => l.textContent?.includes(labelText));
	return (label?.querySelector('input') as HTMLInputElement | undefined) ?? null;
}

/** Радио матрицы — по aria-label «строка — шкала». */
function matrixRadio(container: HTMLElement, row: string, scale: string): HTMLInputElement | null {
	return container.querySelector(`input[aria-label="${row} — ${scale}"]`);
}

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/ai/ai-life — интро и навигация', () => {
	it('интро: обращение к респондентам, «Начать» → ?q=0', async () => {
		const { container } = await mountPage();

		expect(container.textContent).toContain('анонимный характер');
		expect(container.textContent).toContain('10-15 минут');

		await page.getByRole('button', { name: 'Начать' }).click();
		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=0', expect.anything());
	});

	it('«← Предыдущий» с первого вопроса ведёт на интро, со второго — на первый', async () => {
		const first = await mountPage(makeData(), '?q=0');
		await page.getByRole('button', { name: '← Предыдущий' }).click();
		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life', expect.anything());
		cleanup();

		navMocks.goto.mockClear();
		await mountPage(makeData(), '?q=1');
		await page.getByRole('button', { name: '← Предыдущий' }).click();
		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=0', expect.anything());
	});
});

describe('/ai/ai-life — ветвление Q6', () => {
	it('ответ «да» → «Следующий» ведёт на Q7 (индекс 6)', async () => {
		await mountPage(makeData(), '?q=5');

		await page.getByText(Q6_YES, { exact: true }).click();
		await page.getByRole('button', { name: 'Следующий →' }).click();

		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=6', expect.anything());
	});

	it('ответ «нет» → «Следующий» ведёт на Q8 (индекс 6)', async () => {
		await mountPage(makeData(), '?q=5');

		await page.getByText(Q6_NO, { exact: true }).click();
		await page.getByRole('button', { name: 'Следующий →' }).click();

		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=6', expect.anything());
	});

	it('?q=6 в ветке «да» рендерит Q7, в ветке «нет» — Q8', async () => {
		const yes = await mountPage(makeData({ answers: { q6: { choice: Q6_YES } } }), '?q=6');
		expect(yes.container.textContent).toContain('Какими именно технологиями ИИ');
		cleanup();

		const no = await mountPage(makeData({ answers: { q6: { choice: Q6_NO } } }), '?q=6');
		expect(no.container.textContent).toContain('Почему Вы не используете нейросети?');
	});
});

describe('/ai/ai-life — типы вопросов', () => {
	it('single: q1 — radio, выбор отмечается', async () => {
		const { container } = await mountPage(makeData(), '?q=0');

		expect(container.textContent).toContain('Как часто вы заходите в социальные сети');

		await page.getByText('Несколько раз в день', { exact: true }).click();

		const input = inputForLabel(container, 'Несколько раз в день');
		expect(input?.checked).toBe(true);
		expect(inputForLabel(container, 'Несколько раз в час')?.checked).toBe(false);
	});

	it('matrix: q3 — строки × 1–5 + «Затрудняюсь ответить»', async () => {
		const { container } = await mountPage(makeData(), '?q=2');

		const row1 = 'Коммуникация: общение с друзьями, семьей, коллегами, групповые чаты';
		const row2 = 'Потребление контента: просмотр развлекательных видео (Reels/Shorts), мемов';
		expect(container.textContent).toContain(row1);

		matrixRadio(container, row1, '3')?.click();
		// на радио матрицы: untrusted DOM-click (ячейка узкая, trusted промахивается)
		matrixRadio(container, row2, 'Затрудняюсь ответить')?.click();

		expect(matrixRadio(container, row1, '3')?.checked).toBe(true);
		expect(matrixRadio(container, row2, 'Затрудняюсь ответить')?.checked).toBe(true);
		expect(matrixRadio(container, row1, '3')?.checked).toBe(true);
	});

	it('multi: q10 — «Ничего из этого» снимает остальные и наоборот', async () => {
		const { container } = await mountPage(
			makeData({ answers: { q6: { choice: Q6_YES } } }),
			'?q=8'
		);

		expect(container.textContent).toContain('Какие задачи Вы решаете при помощи нейросетей?');

		const normal = 'Поиск информации';
		const none = 'Ничего из этого';

		// q10 — высокий список: в standalone-рендере (без layout-скролла)
		// нижние опции вне viewport, поэтому DOM-клики (untrusted):
		// обработчики onchange логики от trusted-кликов не отличаются
		// тик: Svelte перерисовывает controlled-состояние асинхронно после клика
		const tick = () => new Promise((r) => setTimeout(r, 10));

		inputForLabel(container, normal)?.click();
		await tick();
		expect(inputForLabel(container, normal)?.checked).toBe(true);

		inputForLabel(container, none)?.click();
		await tick();
		expect(inputForLabel(container, none)?.checked).toBe(true);
		expect(inputForLabel(container, normal)?.checked).toBe(false);

		inputForLabel(container, normal)?.click();
		await tick();
		expect(inputForLabel(container, normal)?.checked).toBe(true);
		expect(inputForLabel(container, none)?.checked).toBe(false);
	});

	it('open: q7 — текстовое поле принимает ввод', async () => {
		const { container } = await mountPage(
			makeData({ answers: { q6: { choice: Q6_YES } } }),
			'?q=6'
		);

		expect(container.textContent).toContain('Какими именно технологиями ИИ');

		const textarea = container.querySelector('textarea');
		expect(textarea).not.toBeNull();

		await page.getByRole('textbox').fill('Чат-боты и генераторы изображений');
		expect((container.querySelector('textarea') as HTMLTextAreaElement | null)?.value).toBe(
			'Чат-боты и генераторы изображений'
		);
	});

	it('number: q28 — префилл года рождения из профиля, редактируем', async () => {
		const { container } = await mountPage(makeData(), '?q=25');

		const input = container.querySelector('input[type="number"]') as HTMLInputElement | null;
		expect(input).not.toBeNull();
		expect(input?.value).toBe('2000');

		await page.getByRole('spinbutton').fill('2001');
		expect(
			(container.querySelector('input[type="number"]') as HTMLInputElement | null)?.value
		).toBe('2001');
	});

	it('single: q29 — префилл пола из профиля (male → «Мужской»)', async () => {
		const { container } = await mountPage(makeData(), '?q=26');

		expect(container.textContent).toContain('Укажите, пожалуйста, Ваш пол');
		expect(inputForLabel(container, 'Мужской')?.checked).toBe(true);
		expect(inputForLabel(container, 'Женский')?.checked).toBe(false);
	});

	it('single: q2 — текст «Другое» переживает переключение на обычный вариант', async () => {
		const { container } = await mountPage(makeData(), '?q=1');

		const otherLabel = 'Другое (укажите, сколько)';

		await page.getByText(otherLabel, { exact: true }).click();
		await page.getByRole('textbox').fill('Около 6 часов');

		// переключение на обычный вариант: поле исчезает, текст уходит в черновик
		await page.getByText('Менее 1 часа', { exact: true }).click();
		expect(container.querySelector('input.other-input')).toBeNull();
		expect(inputForLabel(container, 'Менее 1 часа')?.checked).toBe(true);

		// возврат на «Другое» — введённый текст восстановлен
		await page.getByText(otherLabel, { exact: true }).click();
		const restored = container.querySelector('input.other-input') as HTMLInputElement | null;
		expect(restored?.value).toBe('Около 6 часов');
	});

	it('ladder: q38 — 10 ступеней, последняя карта → «Отправить» → save + /ai', async () => {
		const { container } = await mountPage(makeData(), '?q=35');

		const steps = [...container.querySelectorAll('button.step')];
		expect(steps).toHaveLength(10);

		await page.getByRole('button', { name: '7' }).click();
		expect(steps[6]?.classList.contains('selected')).toBe(true);

		await page.getByRole('button', { name: 'Отправить' }).click();

		await vi.waitFor(() => {
			expect(navMocks.goto).toHaveBeenCalled();
		});
		expect(navMocks.goto.mock.calls[0]?.[0]).toBe('/ai');
	});
});

describe('/ai/ai-life — clamp индекса вопроса', () => {
	it('?q=100 (вне диапазона) → переход на последний видимый вопрос ветки', async () => {
		const { container } = await mountPage(makeData(), '?q=100');

		// ветка по умолчанию (q6 без ответа): 36 видимых → clamp на ?q=35 (q38)
		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=35', expect.anything());
		// рендер зажат на последний вопрос: «Отправить» вместо «Следующий →»
		expect(container.textContent).toContain('Отправить');
		expect(container.textContent).not.toContain('Следующий →');
	});

	it('?q=abc (не число) → переход на ?q=0 (первый вопрос)', async () => {
		const { container } = await mountPage(makeData(), '?q=abc');

		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=0', expect.anything());
		expect(container.textContent).toContain('Как часто вы заходите в социальные сети');
	});

	it('смена ответа q6 «да»→«нет» при высоком индексе → forward-clamp на последний видимый', async () => {
		// ?q=30 в ветке «да» (37 видимых) — индекс валиден, перехода нет
		await mountPage(makeData({ answers: { q6: { choice: Q6_YES } } }), '?q=30');
		expect(navMocks.goto).not.toHaveBeenCalled();
		cleanup();

		navMocks.goto.mockClear();
		// после смены ответа q6 на «нет» ветка сжимается до 28 видимых:
		// индекс 30 вне диапазона → clamp на ?q=27 (последний видимый, q38)
		const { container } = await mountPage(
			makeData({ answers: { q6: { choice: Q6_NO } } }),
			'?q=30'
		);
		expect(navMocks.goto).toHaveBeenCalledWith('/ai/ai-life?q=27', expect.anything());
		expect(container.textContent).toContain('Отправить');
	});
});

describe('/ai/ai-life — автосохранение', () => {
	it('изменение ответа → debounce → POST /ai/ai-life?/save с answers', async () => {
		await mountPage(makeData(), '?q=0');

		await page.getByText('Несколько раз в день', { exact: true }).click();

		// до истечения debounce сохранения нет
		await sleep(150);
		expect(fetchMock).not.toHaveBeenCalled();

		// debounce 600 мс истёк — сохранение ушло
		await sleep(700);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/ai/ai-life?/save');
		const body = init.body as FormData;
		expect(body).toBeInstanceOf(FormData);
		const answers = JSON.parse(body.get('answers') as string) as Record<string, unknown>;
		expect(answers).toMatchObject({
			q1: { choice: 'Несколько раз в день' }
		});
	});

	it('multi: q10 — «Другое» с пустым текстом не попадает в autosave-payload', async () => {
		const { container } = await mountPage(
			makeData({ answers: { q6: { choice: Q6_YES } } }),
			'?q=8'
		);

		const otherLabel = 'Другое (что именно?)';

		// отмечаем «Другое», вводим текст, затем стираем его
		await page.getByText(otherLabel, { exact: true }).click();
		await page.getByRole('textbox').fill('Помогаю с рецептами');
		await page.getByRole('textbox').fill('');

		// пустой текст → чекбокс «Другое» снят (spec-review Finding 2)
		expect(inputForLabel(container, otherLabel)?.checked).toBe(false);

		await sleep(700);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		const answers = JSON.parse((init.body as FormData).get('answers') as string) as Record<
			string,
			{ choices?: string[]; other?: string }
		>;
		expect(answers.q10?.choices ?? []).not.toContain(otherLabel);
		expect(answers.q10?.other).toBeUndefined();
	});

	it('«Отправить» сохраняет финальные ответы (включая префилл Q28/Q29) до перехода', async () => {
		await mountPage(makeData(), '?q=35');

		await page.getByRole('button', { name: '7' }).click();
		await page.getByRole('button', { name: 'Отправить' }).click();

		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/ai/ai-life?/save');
		const body = fetchMock.mock.calls[0]?.[1] as unknown as RequestInit;
		const answers = JSON.parse((body.body as FormData).get('answers') as string) as Record<
			string,
			unknown
		>;
		expect(answers).toMatchObject({ q38: 7, q28: 2000, q29: { choice: 'Мужской' } });
	});
});

// ─── Глобальные хуки ──────────────────────────────────────────────────

// fetch стабится на весь файл: реальные POST автосейва не должны уходить
// в сеть из тестового окружения
const fetchMock = vi.fn(
	(_url: string, _init?: RequestInit) => Promise.resolve({ ok: true }) as Promise<Response>
);

beforeEach(() => {
	navMocks.goto.mockClear();
	fetchMock.mockClear();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
	cleanup();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
