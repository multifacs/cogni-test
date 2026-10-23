import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (см. AGENTS.md: campimetry click-through)
import '../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(target?: string | URL, opts?: unknown) => Promise<void>>(() => Promise.resolve())
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (target?: string | URL, opts?: unknown) => navMocks.goto(target, opts)
}));

// Button.svelte импортирует resolve из $app/paths
vi.mock('$app/paths', () => ({
	resolve: (path: string) => path,
	assets: '',
	base: ''
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

type StageStatus = 'done' | 'next' | 'locked';

interface StageFixture {
	id: string;
	title: string;
	description: string;
	href: string;
	status: StageStatus;
}

const STAGE_FIXTURES: Record<string, StageFixture> = {
	survey: {
		id: 'survey',
		title: 'Анкета',
		description: 'Заполните базовую анкету о себе',
		href: '/questionary?from=ai',
		status: 'done'
	},
	'ai-life': {
		id: 'ai-life',
		title: 'ИИ в жизни',
		description: 'Анкета о взаимодействии с ИИ',
		href: '/ai/ai-life',
		status: 'done'
	},
	tests: {
		id: 'tests',
		title: 'Диагностика',
		description: 'Все 6 когнитивных тестов',
		href: '/tests?from=ai',
		status: 'done'
	},
	classification: {
		id: 'classification',
		title: 'Классификация',
		description: 'Тест на классификацию',
		href: '/ai/classification',
		status: 'done'
	}
};

/** Строит stages: doneIds пройдены, первый прочий — next, остальные — locked. */
function makeStages(
	doneIds: string[],
	allDone = false
): { stages: StageFixture[]; allDone: boolean } {
	const order = ['survey', 'ai-life', 'tests', 'classification'];
	let nextAssigned = allDone;
	const stages = order.map((id) => {
		const fixture = { ...STAGE_FIXTURES[id] };
		if (doneIds.includes(id)) {
			fixture.status = 'done';
		} else if (!nextAssigned) {
			fixture.status = 'next';
			nextAssigned = true;
		} else {
			fixture.status = 'locked';
		}
		return fixture;
	});
	return { stages, allDone: allDone || stages.every((s) => s.status === 'done') };
}

function makeData(doneIds: string[], allDone = false) {
	return makeStages(doneIds, allDone);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mountPage(data: ReturnType<typeof makeData> = makeData([])) {
	const result = await render(Page, { props: { data: data as never } });
	// onMount (модалка по localStorage) отрабатывает после кадра
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await sleep(50);
	return result;
}

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/ai — хаб этапов: карточки', () => {
	it('done-карточка — ссылка с исходным href, aria-label; видимого CTA нет', async () => {
		const { container } = await mountPage(makeData(['survey', 'ai-life', 'tests']));

		// survey: href с query не теряется
		const surveyLink = page.getByRole('link', { name: 'Пройти заново: Анкета' });
		await expect.element(surveyLink).toBeInTheDocument();
		expect(surveyLink.element().getAttribute('href')).toBe('/questionary?from=ai');

		// ai-life / classification — без from=
		expect(
			page
				.getByRole('link', { name: 'Пройти заново: ИИ в жизни' })
				.element()
				.getAttribute('href')
		).toBe('/ai/ai-life');
		expect(
			page
				.getByRole('link', { name: 'Пройти заново: Диагностика' })
				.element()
				.getAttribute('href')
		).toBe('/tests?from=ai');

		// CTA «Пройти заново» удалён с карточек
		expect(container.textContent).not.toContain('Пройти заново');
	});

	it('classification done → href /ai/classification', async () => {
		await mountPage(makeData(['survey', 'ai-life', 'tests', 'classification']));

		expect(
			page
				.getByRole('link', { name: 'Пройти заново: Классификация' })
				.element()
				.getAttribute('href')
		).toBe('/ai/classification');
	});

	it('бейдж «Пройдено» рендерится на done-карточке', async () => {
		const { container } = await mountPage(makeData(['survey', 'ai-life', 'tests']));

		const badges = [...container.querySelectorAll('.stage-badge')].filter(
			(b) => b.textContent === 'Пройдено'
		);
		expect(badges).toHaveLength(3);
	});

	it('locked-карточка — НЕ ссылка, бейдж «Заблокировано»', async () => {
		const { container } = await mountPage(makeData(['survey']));

		const lockedItems = [...container.querySelectorAll('li.stage.locked')];
		expect(lockedItems).toHaveLength(2);
		for (const item of lockedItems) {
			expect(item.querySelector('a')).toBeNull();
			expect(item.querySelector('.locked-badge')?.textContent).toBe('Заблокировано');
		}
		expect(container.textContent).toContain('Заблокировано');
	});

	it('next-карточка — ссылка с aria-label; видимого CTA «Начать» нет (регресс)', async () => {
		const { container } = await mountPage(makeData(['survey']));

		const nextLink = page.getByRole('link', { name: 'Перейти: ИИ в жизни' });
		await expect.element(nextLink).toBeInTheDocument();
		expect(nextLink.element().getAttribute('href')).toBe('/ai/ai-life');

		// CTA «Начать» удалён с next-карточки
		expect(container.textContent).not.toContain('Начать');
		expect(container.querySelector('.stage-cta')).toBeNull();
	});

	it('done-карточка — бейдж «Пройдено» с ellipsis-поведением, CTA нет', async () => {
		const { container } = await mountPage(makeData(['survey', 'ai-life', 'tests']));

		expect(container.querySelector('.stage-cta')).toBeNull();

		const badges = [...container.querySelectorAll('a.stage-link.done .stage-badge')];
		expect(badges).toHaveLength(3);

		const style = getComputedStyle(badges[0] as Element);
		expect(style.overflow).toBe('hidden');
		expect(style.textOverflow).toBe('ellipsis');
		expect(style.whiteSpace).toBe('nowrap');
	});

	it('бейджи «Пройдено»/«Заблокировано» не обрезаются (регресс)', async () => {
		const { container } = await mountPage(makeData(['survey']));

		const badges = [...container.querySelectorAll('.stage-badge')];
		// «Пройдено» + «Заблокировано»
		expect(badges.length).toBeGreaterThanOrEqual(3);
		for (const badge of badges) {
			// текст влезает целиком: ellipsis не срабатывает
			expect(badge.scrollWidth).toBeLessThanOrEqual(badge.clientWidth);
		}
	});
});

describe('/ai — модалка завершения', () => {
	it('allDone → модалка «Спасибо за прохождение», «Ок» → goto(/home)', async () => {
		await mountPage(makeData([], true));

		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toBeInTheDocument();

		await page.getByRole('button', { name: 'Ок' }).click();

		// goto('/home') без опций — второй аргумент undefined
		expect(navMocks.goto).toHaveBeenCalledWith('/home', undefined);
	});

	it('клик по done-карточке сбрасывает ai_thanks_shown (модалка может показаться снова)', async () => {
		await mountPage(makeData(['survey', 'ai-life', 'tests']));

		localStorage.setItem('ai_thanks_shown', '1');

		const doneLink = page.getByRole('link', { name: 'Пройти заново: Анкета' });
		await doneLink.click();

		expect(localStorage.getItem('ai_thanks_shown')).toBeNull();
	});

	it('НЕ все done → модалки нет', async () => {
		const { container } = await mountPage(makeData(['survey']));

		expect(container.querySelector('.modal-overlay')).toBeNull();
		expect(container.textContent).not.toContain('Спасибо за прохождение');
	});
});

// ─── Глобальные хуки ──────────────────────────────────────────────────

beforeEach(() => {
	// детерминизм ai_thanks_shown
	localStorage.clear();
	navMocks.goto.mockClear();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});
