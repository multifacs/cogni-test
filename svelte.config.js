import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import adapterAuto from '@sveltejs/adapter-auto';

const buildTarget = process.env.BUILD; // 'node', 'vercel', etc.

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
	preprocess: vitePreprocess(),

	kit: {
		adapter
	}
};

export default config;
