import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startStreaming } from '$lib/stores/streaming.svelte';
import type { TestData } from '$lib/tests';
import Header from './Header.svelte';

// ─── Хоистированные моки ──────────────────────────────────────────────

// $app/state.page — единственное, что читает Header из навигации:
// url.pathname и url.searchParams. Мутируется между кейсами.
const navMocks = vi.hoisted(() => ({
	url: {
		pathname: '/tests/stroop/about',
		searchParams: new URLSearchParams()
	}
}));

vi.mock('$app/state', () => ({
	page: { url: navMocks.url }
}));

// store-мутации (startStreaming) работают только в browser-режиме
vi.mock('$app/environment', () => ({
	browser: true
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

const STREAM_TESTS: TestData[] = [
	{ name: 'stroop', title: 'Струп', path: '/tests/stroop/about', img: '' }
];

/** Минимальные props: text обязателен, action не нужен для пилюли. */
async function mountHeader() {
	await render(Header, { props: { text: 'Тест' } });
}

beforeEach(() => {
	startStreaming([], {});
});

afterEach(() => {
	cleanup();
	navMocks.url.searchParams = new URLSearchParams();
});

describe('Header — streaming pill', () => {
	it('видима при живой очереди на /tests/*', async () => {
		navMocks.url.pathname = '/tests/stroop/about';
		startStreaming(STREAM_TESTS, {});
		await mountHeader();
		await expect.element(page.getByText('Потоковое прохождение')).toBeVisible();
	});

	it('скрыта при пустой очереди', async () => {
		navMocks.url.pathname = '/tests/stroop/about';
		startStreaming([], {});
		await mountHeader();
		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});

	it('скрыта в GTO-сессии (gtoSessionId в URL)', async () => {
		navMocks.url.pathname = '/tests/stroop/about';
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');
		startStreaming(STREAM_TESTS, {});
		await mountHeader();
		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});

	it('скрыта вне /tests (роут /home)', async () => {
		navMocks.url.pathname = '/home';
		startStreaming(STREAM_TESTS, {});
		await mountHeader();
		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});

	it('скрыта на похожем пути /testsfoo (регулярка не матчит)', async () => {
		navMocks.url.pathname = '/testsfoo';
		startStreaming(STREAM_TESTS, {});
		await mountHeader();
		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});

	it('видима в корне /tests', async () => {
		navMocks.url.pathname = '/tests';
		startStreaming(STREAM_TESTS, {});
		await mountHeader();
		await expect.element(page.getByText('Потоковое прохождение')).toBeVisible();
	});
});
