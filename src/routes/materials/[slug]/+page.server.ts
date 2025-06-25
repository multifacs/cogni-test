import { readFileSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function load({ params }) {
	const slug = params.slug;

	const materialsDir = path.resolve('static/materials');
	const raw = readFileSync(path.join(materialsDir, `${slug}.html`), 'utf-8');
	const processed = matter(raw); // извлекаем frontmatter

	return {
		slug,
		content: processed.content
	};
}
