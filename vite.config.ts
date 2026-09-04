import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import { inlineOnnxPlugin } from './src/lib/server/age/inlineOnnxPlugin';

// Docs: src\lib\server\age\docs\onnxPlugin.md
// Plugin source: src\lib\server\age\inlineOnnxPlugin.ts

// console.log('Vite config loaded with MODE:', process.env);

// mkcert нужен только для dev/preview, не для тестов и сборки
const isTest = !!process.env.VITEST; // Vitest выставляет эту переменную сам

export default defineConfig({
	esbuild: {
		drop: process.env.MODE == 'PROD' ? ['console', 'debugger'] : []
	},
	ssr: {
		external: ['@libsql/client', '@libsql/core', '@libsql/hrana-client', 'onnxruntime-node']
	},
	plugins: [sveltekit(), tailwindcss(), ...(isTest ? [] : [mkcert()]), inlineOnnxPlugin()],
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
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
