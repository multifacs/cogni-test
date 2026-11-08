import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session, protocolTrial } from './schema';
import { ProtocolEngine } from '$lib/exercises/protocol/engine';
vi.mock('$lib/server/db', async () => {
	const { drizzle } = await import('drizzle-orm/libsql');
	const { createClient } = await import('@libsql/client');
	const { migrate } = await import('drizzle-orm/libsql/migrator');
	const schema = await import('./schema');
	const db = drizzle(createClient({ url: ':memory:' }), { schema });
	await migrate(db, { migrationsFolder: 'drizzle' });
	return { db };
});
import { db } from '$lib/server/db';
import { postResult, getResults, SessionOwnershipError } from './controllers/result';
async function newUser() {
	const [u] = await db
		.insert(user)
		.values({
			firstname: 'Protocol',
			lastname: 'Pr',
			birthday: new Date('2000-01-01'),
			sex: 'male'
		})
		.returning();
	return u;
}
function sample() {
	const e = new ProtocolEngine('motor_button', 'db');
	e.start(0);
	e.tick(e.waitUntil);
	e.greenOnset(e.waitUntil + 10);
	e.answer('', e.waitUntil + 100);
	return e.payload();
}
describe('protocol storage', () => {
	it('stores and retrieves full history/meta transactionally and idempotently', async () => {
		const u = await newUser(),
			p = sample();
		const id = await postResult(p, 'motor_button', u.id, 'protocol-db-id');
		await postResult(p, 'motor_button', u.id, id);
		const rows = await db.select().from(protocolTrial).where(eq(protocolTrial.sessionId, id));
		expect(rows).toHaveLength(1);
		const results = await getResults('motor_button', u.id);
		expect(results[0].attempts).toEqual(p.results);
		expect(results[0].meta).toMatchObject({
			eligible_for_profile: 'true',
			protocol_version: '1'
		});
	});
	it('rejects forged summaries before creating a session', async () => {
		const u = await newUser(),
			p = sample();
		p.meta.summary = '{}';
		await expect(postResult(p, 'motor_button', u.id, 'protocol-forged')).rejects.toThrow(
			'Summary mismatch'
		);
		expect(await db.select().from(session).where(eq(session.id, 'protocol-forged'))).toEqual(
			[]
		);
	});
	it('rejects reuse of another user session', async () => {
		const a = await newUser(),
			b = await newUser();
		const id = await postResult(sample(), 'motor_button', a.id);
		await expect(postResult(sample(), 'motor_button', b.id, id)).rejects.toBeInstanceOf(
			SessionOwnershipError
		);
	});
	it('persists aborted sessions without invented trials', async () => {
		const u = await newUser(),
			e = new ProtocolEngine('memory_matrix', 'aborted-db');
		e.start(0);
		e.abort(100);
		await postResult(e.payload(), 'memory_matrix', u.id);
		const rows = await getResults('memory_matrix', u.id);
		expect(rows[0].attempts).toHaveLength(1);
		expect(rows[0].meta).toMatchObject({
			completed: 'false',
			end_reason: 'aborted',
			eligible_for_profile: 'false'
		});
	});
});
