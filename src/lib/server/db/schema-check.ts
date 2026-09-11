import type { Client } from '@libsql/client';
import { getTableColumns, getTableName, is, Table } from 'drizzle-orm';

export type SchemaDiff = {
	missingTables: string[];
	missingColumnsByTable: Record<string, string[]>;
};

/**
 * Extract the expected table->columns map from the drizzle schema module.
 * Column names are DB names ('first_name'), not TS keys ('firstname').
 */
export function extractExpectedTables(schema: Record<string, unknown>): Map<string, Set<string>> {
	const tables = new Map<string, Set<string>>();
	for (const value of Object.values(schema)) {
		if (!is(value, Table)) continue;
		const columns = new Set(Object.values(getTableColumns(value)).map((c) => c.name));
		tables.set(getTableName(value), columns);
	}
	return tables;
}

const toLowerSet = (names: Set<string>): Set<string> =>
	new Set([...names].map((n) => n.toLowerCase()));

/**
 * Compare expected (drizzle) tables/columns against the actual database state.
 * Both sides are lowercased first: sqlite_master stores names in DDL case.
 * Extra tables/columns in `actual` are not errors (e.g. drizzle_migrations).
 */
export function diffSchemas(
	expected: Map<string, Set<string>>,
	actual: Map<string, Set<string>>
): SchemaDiff {
	const expectedLower = new Map(
		[...expected].map(([name, cols]) => [name.toLowerCase(), toLowerSet(cols)])
	);
	const actualLower = new Map(
		[...actual].map(([name, cols]) => [name.toLowerCase(), toLowerSet(cols)])
	);

	const missingTables: string[] = [];
	const missingColumnsByTable: Record<string, string[]> = {};

	for (const [name, expectedColumns] of expectedLower) {
		const actualColumns = actualLower.get(name);
		if (!actualColumns) {
			missingTables.push(name);
			continue;
		}
		const missing = [...expectedColumns].filter((c) => !actualColumns.has(c)).sort();
		if (missing.length > 0) missingColumnsByTable[name] = missing;
	}

	return { missingTables: missingTables.sort(), missingColumnsByTable };
}

/** Human-readable Russian report of a non-empty schema diff. */
export function formatSchemaDiff(diff: SchemaDiff, dbLabel: string): string {
	if (diff.missingTables.length === 0 && Object.keys(diff.missingColumnsByTable).length === 0) {
		return `Файл БД ${dbLabel} соответствует схеме приложения.`;
	}

	const lines: string[] = [`Файл БД ${dbLabel} не соответствует схеме приложения:`];
	if (diff.missingTables.length > 0) {
		lines.push(`  - отсутствуют таблицы: ${diff.missingTables.join(', ')}`);
	}
	for (const [table, columns] of Object.entries(diff.missingColumnsByTable)) {
		lines.push(`  - таблица ${table}: отсутствуют колонки: ${columns.join(', ')}`);
	}
	lines.push(
		'Запустите npm run db:push (или npm run db:migrate) либо укажите актуальный файл DATABASE_URL.'
	);
	return lines.join('\n');
}

/** Read the actual table->columns map from a SQLite database via sqlite_master + PRAGMA table_info. */
export async function fetchActualTables(client: Client): Promise<Map<string, Set<string>>> {
	const tables = new Map<string, Set<string>>();
	const tableRows = await client.execute(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
	);
	for (const row of tableRows.rows) {
		const name = String(row.name);
		const quoted = `"${name.replace(/"/g, '""')}"`;
		const info = await client.execute(`PRAGMA table_info(${quoted})`);
		const columns = new Set<string>();
		for (const col of info.rows) {
			columns.add(String(col.name));
		}
		tables.set(name, columns);
	}
	return tables;
}

/**
 * Throw with a human-readable message when the database lacks tables/columns
 * from the current drizzle schema. Only throws — logging is the caller's job.
 */
export async function assertDatabaseMatchesSchema(
	client: Client,
	schema: Record<string, unknown>,
	dbLabel?: string
): Promise<void> {
	const expected = extractExpectedTables(schema);
	if (expected.size === 0) return;

	const actual = await fetchActualTables(client);
	const diff = diffSchemas(expected, actual);
	if (diff.missingTables.length === 0 && Object.keys(diff.missingColumnsByTable).length === 0) {
		return;
	}
	throw new Error(formatSchemaDiff(diff, dbLabel ?? 'DATABASE_URL'));
}
