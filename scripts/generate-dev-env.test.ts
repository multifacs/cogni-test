// scripts/generate-dev-env.test.ts
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts', 'generate-dev-env.ts');
const execNode = (
	args: string[],
	options: { cwd?: string; timeout?: number } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
	return new Promise((resolve, reject) => {
		execFile(
			process.execPath,
			[scriptPath, ...args],
			{ cwd: options.cwd ?? repoRoot, timeout: options.timeout ?? 30000 },
			(error, stdout, stderr) => {
				resolve({
					exitCode: (error?.code as number) || 0,
					stdout: stdout.toString(),
					stderr: stderr.toString()
				});
			}
		);
	});
};

const scratchDir = mkdtempSync(join(tmpdir(), 'cogni-dev-env-test-'));

describe('generate-dev-env CLI', () => {
	it('Case A: generates correct structure with all 6 keys', async () => {
		const out = join(scratchDir, 'a.env');
		const { exitCode, stdout } = await execNode(['--output', out]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Generated:');

		const content = readFileSync(out, 'utf8');
		const lines = content.split('\n');
		expect(lines[0]).toMatch(/^PUBLIC_VAPID_KEY=/);
		expect(lines[1]).toMatch(/^PRIVATE_VAPID_KEY=/);
		expect(lines[2]).toBe('PUBLIC_VAPID_SUBJECT=mailto:example@mail.com');
		expect(lines[3]).toBe('DATABASE_URL=file:./sqlite.db');
		expect(lines[4]).toBe('MODE=DEV');
		expect(lines[5]).toMatch(/^ADMIN_PASSWORD=/);
		expect(lines[6]).toBe(''); // trailing newline => exactly 10 lines of content

		// Verify it ends with newline
		expect(content.endsWith('\n')).toBe(true);
	});

	it('Case B: works on fresh clone (no .env in cwd)', async () => {
		const emptyDir = mkdtempSync(join(scratchDir, 'fresh-'));
		const out = join(scratchDir, 'b.env');
		const { exitCode, stdout } = await execNode(['--output', out], { cwd: emptyDir });
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Generated:');
		expect(stdout).toContain(out);

		const content = readFileSync(out, 'utf8');
		expect(content).toContain('PUBLIC_VAPID_KEY=');
		expect(content).toContain('DATABASE_URL=file:./sqlite.db');
	});

	it('Case C: refuses overwrite without --force', async () => {
		const out = join(scratchDir, 'c.env');
		writeFileSync(out, '---SENTINEL---', 'utf8');
		const { exitCode, stderr } = await execNode(['--output', out]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('--force');
		expect(readFileSync(out, 'utf8')).toBe('---SENTINEL---');
	});

	it('Case D: overwrites with --force', async () => {
		const out = join(scratchDir, 'c.env');
		expect(readFileSync(out, 'utf8')).toBe('---SENTINEL---');
		const { exitCode } = await execNode(['--force', '--output', out]);
		expect(exitCode).toBe(0);
		const content = readFileSync(out, 'utf8');
		expect(content).toContain('PUBLIC_VAPID_KEY=');
		expect(content).not.toContain('SENTINEL');
	});

	it('Case E: VAPID keys differ between runs', async () => {
		const out1 = join(scratchDir, 'e1.env');
		const out2 = join(scratchDir, 'e2.env');
		const { exitCode: e1 } = await execNode(['--output', out1]);
		expect(e1).toBe(0);
		const { exitCode: e2 } = await execNode(['--output', out2]);
		expect(e2).toBe(0);

		const c1 = readFileSync(out1, 'utf8');
		const c2 = readFileSync(out2, 'utf8');
		const pk1 = c1.split('\n').find((l) => l.startsWith('PUBLIC_VAPID_KEY='));
		const pk2 = c2.split('\n').find((l) => l.startsWith('PUBLIC_VAPID_KEY='));
		expect(pk1).not.toBe(pk2);
	});

	it('Case F: --output as last token fails', async () => {
		const { exitCode, stderr } = await execNode(['--output']);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('--output');
	});

	it('Case G: stdout contains no secret values', async () => {
		const out = join(scratchDir, 'g.env');
		const { exitCode, stdout, stderr } = await execNode(['--output', out]);
		expect(exitCode).toBe(0);

		expect(stdout).toContain('Generated: ' + out);
		expect(stdout).toContain('PUBLIC_VAPID_KEY');
		expect(stdout).toContain('PRIVATE_VAPID_KEY');
		expect(stdout).toContain('ADMIN_PASSWORD');

		const content = readFileSync(out, 'utf8');
		const privateKey = content
			.split('\n')
			.find((l) => l.startsWith('PRIVATE_VAPID_KEY='))
			?.slice('PRIVATE_VAPID_KEY='.length);
		const adminPw = content
			.split('\n')
			.find((l) => l.startsWith('ADMIN_PASSWORD='))
			?.slice('ADMIN_PASSWORD='.length);

		expect(stdout).not.toContain(privateKey!);
		expect(stderr).not.toContain(privateKey!);
		expect(stdout).not.toContain(adminPw!);
		expect(stderr).not.toContain(adminPw!);
	});
});
