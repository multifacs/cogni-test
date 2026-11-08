import { cleanup, render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Playground from './Playground.svelte';
import { ProtocolEngine } from './engine';
import type { ProtocolPayload } from './types';
import '../../../app.css';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn(), goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path, base: '' }));
vi.mock('$lib/client/offline-queue', () => ({
	enqueueAttempt: vi.fn().mockResolvedValue('queued'),
	flushQueue: vi.fn().mockResolvedValue({ flushed: 0 })
}));

beforeEach(() => {
	expect.hasAssertions();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('Новые тесты — ввод и сохранение', () => {
	it('блокирует ввод во время показа памяти и сохраняет только предъявленную пробу при выходе', async () => {
		const save = vi.fn<(payload: ProtocolPayload) => void>();
		const { container } = await render(Playground, {
			props: {
				data: { slug: 'memory_matrix' },
				gameEnd: vi.fn(),
				sendResults: save
			}
		});
		await page.getByRole('button', { name: 'Начать тест', exact: true }).click();
		const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
		expect(cells).toHaveLength(9);
		expect(cells.every((cell) => cell.disabled)).toBe(true);
		expect(container.querySelectorAll('.cell.target')).toHaveLength(3);
		await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
		expect(save).toHaveBeenCalledTimes(1);
		const payload = save.mock.calls[0][0];
		expect(payload.results).toHaveLength(1);
		expect(payload.meta.end_reason).toBe('aborted');
		expect(payload.meta.completed).toBe('false');
	});

	it('завершает раннее pointerdown одним фальстартом без отрицательного RT', async () => {
		const save = vi.fn<(payload: ProtocolPayload) => void>();
		const { container } = await render(Playground, {
			props: {
				data: { slug: 'motor_button' },
				gameEnd: vi.fn(),
				sendResults: save
			}
		});
		await page.getByRole('button', { name: 'Начать тест', exact: true }).click();
		await page.getByRole('button', { name: 'Нажать', exact: true }).click();
		expect(save).toHaveBeenCalledTimes(1);
		const payload = save.mock.calls[0][0];
		expect(payload.results).toHaveLength(1);
		expect(payload.results[0].is_false_start).toBe(true);
		expect(payload.results[0].response_time_ms).toBeNull();
		expect(container.textContent).toContain('Фальстарт');
	});

	it('перерисовывает выбранные клетки памяти после исчезновения узора', async () => {
		const engines: ProtocolEngine[] = [];
		const original = ProtocolEngine.prototype.start;
		vi.spyOn(ProtocolEngine.prototype, 'start').mockImplementation(function (
			this: ProtocolEngine,
			now
		) {
			engines.push(this);
			original.call(this, now);
		});
		const { container } = await render(Playground, {
			props: {
				data: { slug: 'memory_matrix' },
				gameEnd: vi.fn(),
				sendResults: vi.fn()
			}
		});
		await page.getByRole('button', { name: 'Начать тест', exact: true }).click();
		const active = engines[0];
		if (!active) throw new Error('Engine was not started');
		// Advance the presentation boundary while retaining real browser input.
		active.phaseUntil = performance.now();
		await expect
			.poll(() => container.querySelector<HTMLButtonElement>('.cell')?.disabled)
			.toBe(false);
		await page.getByRole('button', { name: 'Клетка 1', exact: true }).click();
		await expect
			.poll(() =>
				container.querySelector<HTMLButtonElement>('.cell')?.getAttribute('aria-pressed')
			)
			.toBe('true');
		expect(container.querySelectorAll('.cell.target')).toHaveLength(0);
	});
});
