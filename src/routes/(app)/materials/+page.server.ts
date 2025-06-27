import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function load() {
	const materialsDir = path.resolve('static/materials');
	const files = readdirSync(materialsDir).filter((f) => f.endsWith('.html'));

	const articles = files.map((filename) => {
		const raw = readFileSync(path.join(materialsDir, filename), 'utf-8');
		const { data } = matter(raw); // извлекаем frontmatter
		return {
			slug: filename.replace('.html', ''),
			title: data.title || filename,
			emoji: data.emoji || '📄'
		};
	});

	return {
		articles
	};
}
