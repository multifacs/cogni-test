import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const slug = params.slug;
	// console.log(slug);

	try {
		await import(`$lib/tests/${slug}/Playground.svelte`);
	} catch (err) {
		console.log(err);
		error(404, 'test not found');
	}

	const data: {
		words?: string[];
		silhouettes?: Record<string, string>;
	} = {};

	if (slug == 'munsterberg' || slug == 'memory') {
		const response = await fetch('/words'); // Путь к файлу
		const text = await response.text();
		const words = text
			.split('\n')
			.map((x) => x.split('\t')[0])
			.filter((x) => x.length <= 9);
		data.words = words;
	}

	if (slug == 'campimetry') {
		const silhouettes = {
			swallow: '/campimetry/swallow.svg',
			alpaca: '/campimetry/alpaca.svg',
			pig: '/campimetry/pig.svg'
		};

		data.silhouettes = silhouettes;
	}

	return data;
}
