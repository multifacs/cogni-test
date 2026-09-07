import { mdsvex } from 'mdsvex';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import mkcert from 'vite-plugin-mkcert';
import { inlineOnnxPlugin } from './src/lib/server/age/inlineOnnxPlugin.ts';

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
		noExternal: true,
		external: ['@libsql/client', '@libsql/core', '@libsql/hrana-client', 'onnxruntime-node']
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			preprocess: [mdsvex({ extensions: ['.svx', '.md'] })],
			extensions: ['.svelte', '.svx', '.md'],
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		}),
		...(isTest ? [] : [mkcert()]),
		inlineOnnxPlugin()
	],
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
					include: ['src/**/*.{test,spec}.{js,ts}','scripts/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
