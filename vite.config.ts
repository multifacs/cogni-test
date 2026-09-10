import { mdsvex } from 'mdsvex';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import mkcert from 'vite-plugin-mkcert';
import { inlineOnnxPlugin } from './src/lib/server/age/inlineOnnxPlugin.ts';
import { fileURLToPath } from 'node:url';

// Docs: src\lib\server\age\docs\onnxPlugin.md
// Plugin source: src\lib\server\age\inlineOnnxPlugin.ts

// console.log('Vite config loaded with MODE:', process.env);

// mkcert нужен только для dev/preview, не для тестов и сборки
const isTest = !!process.env.VITEST; // Vitest выставляет эту переменную сам

// Единый список внешних SSR-зависимостей: используется в ssr.external (build/dev)
// и восстанавливается в vitest плагином vitestSsrExternalRestore (см. ниже).
const SSR_EXTERNAL_DEPS = [
	'@libsql/client',
	'@libsql/core',
	'@libsql/hrana-client',
	'localforage',
	'onnxruntime-node',
	'short-uuid',
	'web-push'
];

/**
 * Vitest's configEnvironment hook replaces resolve.external with node builtins
 * and forces noExternal=true, inlining CJS deps into the SSR module runner
 * ("exports is not defined"). Restore the app's external deps for the ssr
 * environment at server startup — before vite's lazy isExternal cache is built
 * (first ssr transform) — so they load natively, mirroring vite dev behavior.
 */
function vitestSsrExternalRestore(): Plugin {
	return {
		name: 'vitest-ssr-external-restore',
		apply: 'serve',
		configureServer(server) {
			if (!isTest) return;
			const env = server.environments.ssr;
			if (!env) return;
			const external = env.config.resolve.external;
			const missing = SSR_EXTERNAL_DEPS.filter((id) => !external.includes(id));
			env.config.resolve.external = [...external, ...missing];
		}
	};
}

export default defineConfig({
	resolve: {
		alias: isTest
			? [
					{
						find: /^cookie$/,
						replacement: fileURLToPath(
							new URL('./src/lib/tests/shims/cookie.mjs', import.meta.url)
						)
					}
				]
			: []
	},
	esbuild: {
		drop: process.env.MODE == 'PROD' ? ['console', 'debugger'] : []
	},
	ssr: {
		noExternal: true,
		// vite 8 SSR runner: UMD CJS interop broken → undefined default import (top-level createInstance in gto-button-data.ts)
		// NOTE: entries in external take precedence over noExternal: true, so they become runtime require()s
		// in the adapter-node build and MUST be real runtime deps listed in 'dependencies' (Dockerfile runs npm prune --omit=dev)
		// In vitest this list is restored by vitestSsrExternalRestore (vitest nullifies ssr.external in tests).
		external: SSR_EXTERNAL_DEPS
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
		vitestSsrExternalRestore(),
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
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
