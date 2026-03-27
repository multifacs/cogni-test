import { mdsvex } from 'mdsvex';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import adapterAuto from '@sveltejs/adapter-auto';

const buildTarget = process.env.BUILD || 'node'; // 'node', 'vercel', etc.
let adapter;

if (buildTarget === 'vercel') {
	adapter = adapterVercel();
} else if (buildTarget === 'node') {
	adapter = adapterNode();
} else {
	adapter = adapterAuto();
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	// preprocess: [vitePreprocess()],
	kit: {
		adapter,
		// svelte-kit вообще может автоматически регистрировать service worker
		// но только в билде, чтобы работал локально, надо будет ручками регать
		serviceWorker: { register: false }
	},
	extensions: ['.svelte', '.svx']
	// extensions: ['.svelte']
};

export default config;
