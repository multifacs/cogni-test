import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	esbuild: {
		drop: process.env.MODE == 'PROD' ? ['console', 'debugger'] : []
	},
	plugins: [sveltekit(), tailwindcss()],
});
