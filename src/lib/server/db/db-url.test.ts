import { describe, expect, it } from 'vitest';
import { classifyDatabaseUrl } from './db-url';

describe('classifyDatabaseUrl', () => {
	it('returns unset for undefined', () => {
		expect(classifyDatabaseUrl(undefined)).toEqual({ mode: 'unset' });
	});

	it('returns unset for empty string', () => {
		expect(classifyDatabaseUrl('')).toEqual({ mode: 'unset' });
	});

	it('returns memory for :memory:', () => {
		expect(classifyDatabaseUrl(':memory:')).toEqual({ mode: 'memory' });
	});

	it('returns memory for file::memory:', () => {
		expect(classifyDatabaseUrl('file::memory:')).toEqual({ mode: 'memory' });
	});

	it('returns memory for file::memory:?cache=shared', () => {
		expect(classifyDatabaseUrl('file::memory:?cache=shared')).toEqual({ mode: 'memory' });
	});

	it('returns file for file:./sqlite.db', () => {
		expect(classifyDatabaseUrl('file:./sqlite.db')).toEqual({
			mode: 'file',
			path: './sqlite.db'
		});
	});

	it('returns file for file:sqlite.db (no ./)', () => {
		expect(classifyDatabaseUrl('file:sqlite.db')).toEqual({
			mode: 'file',
			path: 'sqlite.db'
		});
	});

	it('returns file for file:/abs/path/db.sqlite', () => {
		expect(classifyDatabaseUrl('file:/abs/path/db.sqlite')).toEqual({
			mode: 'file',
			path: '/abs/path/db.sqlite'
		});
	});

	it('returns remote for libsql://...', () => {
		expect(classifyDatabaseUrl('libsql://my-db.turso.io')).toEqual({ mode: 'remote' });
	});

	it('returns remote for https://...', () => {
		expect(classifyDatabaseUrl('https://my-db.turso.io')).toEqual({ mode: 'remote' });
	});

	it('returns remote for http://...', () => {
		expect(classifyDatabaseUrl('http://localhost:8080')).toEqual({ mode: 'remote' });
	});

	it('returns remote for ws://...', () => {
		expect(classifyDatabaseUrl('ws://localhost:8080')).toEqual({ mode: 'remote' });
	});

	it('returns remote for wss://...', () => {
		expect(classifyDatabaseUrl('wss://localhost:8080')).toEqual({ mode: 'remote' });
	});
});
