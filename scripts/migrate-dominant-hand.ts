// scripts/migrate-dominant-hand.ts
// Инвертирует legacy-значения dominant_hand ('left' <-> 'right') в таблице profile_survey.
// Контекст: в flows.ts маппинг dominantHand был перепутан («Правая» -> 'left');
// фикс маппинга уже применён, этот скрипт чинит уже сохранённые данные.
//
// По умолчанию — dry-run (только подсчёт). Запись только с флагом --confirm.
// ВНИМАНИЕ: повторный запуск инвертирует значения обратно.
import { createClient, type Client } from '@libsql/client';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const UPDATE_SQL = `
	UPDATE profile_survey
	SET dominant_hand = CASE
		WHEN dominant_hand = 'left' THEN 'right'
		WHEN dominant_hand = 'right' THEN 'left'
	END
	WHERE dominant_hand IN ('left', 'right')
`;

export interface DominantHandMigrationResult {
	/** Строки с 'left' до миграции */
	leftRows: number;
	/** Строки с 'right' до миграции */
	rightRows: number;
	/** Изменённые строки (0 в dry-run) */
	changed: number;
	mode: 'dry-run' | 'applied';
}

async function countByValue(client: Client, value: 'left' | 'right'): Promise<number> {
	const result = await client.execute({
		sql: 'SELECT COUNT(*) AS n FROM profile_survey WHERE dominant_hand = ?',
		args: [value]
	});
	return Number(result.rows[0]?.n ?? 0);
}

/**
 * Чистая функция миграции: не читает env, не печатает, работает с переданным клиентом.
 * NULL и значения вне ('left','right') не трогает.
 */
export async function migrateDominantHand(
	client: Client,
	options: { confirm: boolean }
): Promise<DominantHandMigrationResult> {
	const leftRows = await countByValue(client, 'left');
	const rightRows = await countByValue(client, 'right');

	if (!options.confirm) {
		return { leftRows, rightRows, changed: 0, mode: 'dry-run' };
	}

	const update = await client.execute(UPDATE_SQL);
	return { leftRows, rightRows, changed: update.rowsAffected, mode: 'applied' };
}

async function main(): Promise<void> {
	const confirm = process.argv.slice(2).includes('--confirm');

	// Загружаем .env только в CLI-режиме (тест импортирует модуль без dotenv).
	await import('dotenv/config');

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('Error: DATABASE_URL is not set. Export it or add to .env.');
		process.exit(1);
	}

	const client = createClient({ url: databaseUrl });
	try {
		const result = await migrateDominantHand(client, { confirm });

		if (result.mode === 'dry-run') {
			console.log('[dry-run] Rows that WOULD be changed in profile_survey:');
			console.log(`  'left'  -> 'right': ${result.leftRows}`);
			console.log(`  'right' -> 'left' : ${result.rightRows}`);
			console.log(`  total: ${result.leftRows + result.rightRows}`);
			console.log('No data was modified. Re-run with --confirm to apply.');
		} else {
			console.log(`Applied: ${result.changed} row(s) updated in profile_survey.`);
		}
		console.log(
			'WARNING: this migration is an inversion. Running it again flips the values back.'
		);
	} finally {
		client.close();
	}
}

const isDirectRun = (() => {
	try {
		return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
	} catch {
		return false;
	}
})();

if (isDirectRun) {
	main().catch((error) => {
		console.error('Migration failed:', error);
		process.exit(1);
	});
}
