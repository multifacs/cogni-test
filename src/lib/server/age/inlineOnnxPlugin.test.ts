import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertOnnxModelsAvailable, inlineOnnxPlugin } from './inlineOnnxPlugin';

function makeTmpDir(): string {
	return mkdtempSync(join(tmpdir(), 'inlineOnnx-'));
}

describe('assertOnnxModelsAvailable', () => {
	it('throws for nonexistent directory', () => {
		const nonexistent = join(tmpdir(), `nonexistent-${Date.now()}`);
		expect.assertions(2);
		expect(() => assertOnnxModelsAvailable(nonexistent)).toThrow(/ONNX models/);
		expect(() => assertOnnxModelsAvailable(nonexistent)).toThrow(/git submodule update --init/);
	});

	it('throws for empty directory', () => {
		const tmpDir = makeTmpDir();
		expect.assertions(2);
		try {
			expect(() => assertOnnxModelsAvailable(tmpDir)).toThrow(/no \.onnx files/);
			expect(() => assertOnnxModelsAvailable(tmpDir)).toThrow(/git submodule update --init/);
		} finally {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('does not throw for directory with .onnx file', () => {
		const tmpDir = makeTmpDir();
		writeFileSync(join(tmpDir, 'dummy.onnx'), '');
		expect.assertions(1);
		try {
			expect(() => assertOnnxModelsAvailable(tmpDir)).not.toThrow();
		} finally {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});

describe('inlineOnnxPlugin', () => {
	it('load throws descriptive error for missing file', () => {
		const tmpDir = makeTmpDir();
		const plugin = inlineOnnxPlugin(tmpDir);
		expect.assertions(2);
		try {
			expect(() => plugin.load('\0inline-onnx:' + join(tmpDir, 'missing.onnx'))).toThrow(
				/Missing ONNX model file/
			);
			expect(() => plugin.load('\0inline-onnx:' + join(tmpDir, 'missing.onnx'))).toThrow(
				/git submodule update --init/
			);
		} finally {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('load returns base64 export for existing file', () => {
		const tmpDir = makeTmpDir();
		const filePath = join(tmpDir, 'model.onnx');
		writeFileSync(filePath, Buffer.from([0x01, 0x02, 0x03]));
		const plugin = inlineOnnxPlugin(tmpDir);
		expect.assertions(1);
		try {
			const result = plugin.load('\0inline-onnx:' + filePath);
			const expected = Buffer.from([0x01, 0x02, 0x03]).toString('base64');
			expect(result).toBe(`export default "${expected}";`);
		} finally {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('buildStart throws when VITEST is unset and dir is empty', () => {
		const original = process.env.VITEST;
		delete process.env.VITEST;
		const tmpDir = makeTmpDir();
		expect.assertions(1);
		try {
			const plugin = inlineOnnxPlugin(tmpDir);
			expect(() => plugin.buildStart()).toThrow(/git submodule update --init/);
		} finally {
			if (original !== undefined) process.env.VITEST = original;
			else delete process.env.VITEST;
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('buildStart does not throw when VITEST is set even for empty dir', () => {
		const original = process.env.VITEST;
		process.env.VITEST = 'true';
		const tmpDir = makeTmpDir();
		expect.assertions(1);
		try {
			const plugin = inlineOnnxPlugin(tmpDir);
			expect(() => plugin.buildStart()).not.toThrow();
		} finally {
			if (original !== undefined) process.env.VITEST = original;
			else delete process.env.VITEST;
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
