import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';

// Docs: src\lib\server\age\docs\onnxPlugin.md

function inlineOnnxPlugin() {
	const virtualId = 'virtual:inline-onnx/';
	return {
		name: 'inline-onnx',
		resolveId(source: string, importer?: string) {
			if (!source.startsWith(virtualId)) return;
			const relPath = source.slice(virtualId.length);
			if (importer && !relPath.startsWith('/')) {
				const abs = resolve(dirname(importer), relPath);
				return '\0inline-onnx:' + abs;
			}
			return '\0inline-onnx:' + relPath;
		},
		load(id: string) {
			if (!id.startsWith('\0inline-onnx:')) return null;
			const filePath = id.slice('\0inline-onnx:'.length);
			const buffer = readFileSync(filePath);
			const base64 = buffer.toString('base64');
			return `export default "${base64}";`;
		}
	};
}

// console.log('Vite config loaded with MODE:', process.env);

export default defineConfig({
	esbuild: {
		drop: process.env.MODE == 'PROD' ? ['console', 'debugger'] : []
	},
	ssr: {
		external: ['@libsql/client', '@libsql/core', '@libsql/hrana-client', 'onnxruntime-node']
	},
	plugins: [sveltekit(), tailwindcss(), mkcert(), inlineOnnxPlugin()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
