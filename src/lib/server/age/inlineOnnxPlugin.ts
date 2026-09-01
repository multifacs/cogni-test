import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const virtualId = 'virtual:inline-onnx/';
const prefix = '\0inline-onnx:';

export const DEFAULT_MODELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'models');

export function assertOnnxModelsAvailable(modelsDir: string): void {
	if (!existsSync(modelsDir)) {
		throw new Error(
			`ONNX models directory is missing at ${modelsDir}. ` +
				`The git submodule is likely not initialized. ` +
				`Run: git submodule update --init`
		);
	}

	const files = readdirSync(modelsDir);
	const hasOnnx = files.some((f) => f.endsWith('.onnx'));
	if (!hasOnnx) {
		throw new Error(
			`ONNX models directory at ${modelsDir} contains no .onnx files. ` +
				`The git submodule is likely not initialized. ` +
				`Run: git submodule update --init`
		);
	}
}

export function inlineOnnxPlugin(modelsDir: string = DEFAULT_MODELS_DIR): Plugin {
	return {
		name: 'inline-onnx',
		buildStart() {
			if (process.env.VITEST) return;
			assertOnnxModelsAvailable(modelsDir);
		},
		resolveId(source: string, importer?: string) {
			if (!source.startsWith(virtualId)) return;
			const relPath = source.slice(virtualId.length);
			if (importer && !relPath.startsWith('/')) {
				const abs = resolve(dirname(importer), relPath);
				return prefix + abs;
			}
			return prefix + relPath;
		},
		load(id: string) {
			if (!id.startsWith(prefix)) return null;
			const filePath = id.slice(prefix.length);
			if (!existsSync(filePath)) {
				throw new Error(
					`Missing ONNX model file: ${filePath}. ` +
						`The submodule may be on the wrong branch or the file was renamed. ` +
						`Run: git submodule update --init`
				);
			}
			const buffer = readFileSync(filePath);
			const base64 = buffer.toString('base64');
			return `export default "${base64}";`;
		}
	};
}
