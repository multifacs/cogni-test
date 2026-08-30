import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';

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

export default defineConfig({
	esbuild: {
		drop: process.env.MODE == 'PROD' ? ['console', 'debugger'] : []
	},
	ssr: {
		external: ['@libsql/client', '@libsql/core', '@libsql/hrana-client', 'onnxruntime-node']
	},
	plugins: [sveltekit(), tailwindcss(), inlineOnnxPlugin()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vitest.no-mkcert.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: { name: 'playwright' } as any,
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vitest.no-mkcert.config.ts',
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
