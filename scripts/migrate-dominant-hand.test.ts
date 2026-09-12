// scripts/migrate-dominant-hand.test.ts
// Тестирует чистую функцию migrateDominantHand на собственном :memory:-клиенте.
// Без dotenv и без DATABASE_URL.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { migrateDominantHand } from './migrate-dominant-hand';

let client: Client | undefined;

const setup = async (): Promise<Client> => {
	const c = createClient({ url: ':memory:' });
	await c.execute('CREATE TABLE profile_survey (id INTEGER PRIMARY KEY, dominant_hand TEXT)');
	await c.execute(
		"INSERT INTO profile_survey (dominant_hand) VALUES ('left'), ('right'), ('left'), (NULL), ('other')"
	);
	client = c;
	return c;
};

const hands = async (c: Client): Promise<(string | null)[]> => {
	const result = await c.execute('SELECT dominant_hand FROM profile_survey ORDER BY id');
	return result.rows.map((row) =>
		row.dominant_hand === null ? null : String(row.dominant_hand)
	);
};

afterEach(() => {
	client?.close();
	client = undefined;
});

describe('migrateDominantHand', () => {
	it('dry-run: считает left/right, не меняет данные', async () => {
		const c = await setup();
		const result = await migrateDominantHand(c, { confirm: false });
		expect(result).toEqual({ leftRows: 2, rightRows: 1, changed: 0, mode: 'dry-run' });
		expect(await hands(c)).toEqual(['left', 'right', 'left', null, 'other']);
	});

	it('confirm: инвертирует left <-> right, не трогает NULL и прочие значения', async () => {
		const c = await setup();
		const result = await migrateDominantHand(c, { confirm: true });
		expect(result.mode).toBe('applied');
		expect(result.changed).toBe(3);
		expect(await hands(c)).toEqual(['right', 'left', 'right', null, 'other']);
	});

	it('повторный запуск инвертирует обратно (идемпотентность инверсии)', async () => {
		const c = await setup();
		await migrateDominantHand(c, { confirm: true });
		await migrateDominantHand(c, { confirm: true });
		expect(await hands(c)).toEqual(['left', 'right', 'left', null, 'other']);
	});

	it('пустая таблица: changed = 0', async () => {
		const c = await setup();
		await c.execute('DELETE FROM profile_survey');
		const result = await migrateDominantHand(c, { confirm: true });
		expect(result).toEqual({ leftRows: 0, rightRows: 0, changed: 0, mode: 'applied' });
	});
});
