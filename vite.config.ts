import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import mkcert from'vite-plugin-mkcert'

export default defineConfig({
	esbuild: {
		drop: process.env.MODE == 'PROD' ? ['console', 'debugger'] : []
	},
	plugins: [sveltekit(), tailwindcss(), mkcert()],
	define: {
		'process.env.NODE_ENV': '"production"'
	}
});
