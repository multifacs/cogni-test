// scripts/generate-dev-env.ts
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import webpush from 'web-push';

const args = process.argv.slice(2);
const force = args.includes('--force');
const outputIndex = args.indexOf('--output');
const outputPathArg = outputIndex !== -1 ? args[outputIndex + 1] : undefined;

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// Guard: --output with no value after it
if (outputIndex !== -1 && args[outputIndex + 1] === undefined) {
	console.error('Error: --output requires a file path.');
	process.exit(1);
}

const outputPath = outputPathArg
	? isAbsolute(outputPathArg)
		? outputPathArg
		: join(repoRoot, outputPathArg)
	: join(repoRoot, '.env');

if (existsSync(outputPath) && !force) {
	console.error(`Error: ${outputPath} already exists. Use --force to overwrite.`);
	process.exit(1);
}

const PUBLIC_VAPID_SUBJECT = 'mailto:example@mail.com';
const DATABASE_URL = 'file:./sqlite.db';
const MODE = 'DEV';
const ADMIN_PASSWORD = '123';

const keys = webpush.generateVAPIDKeys();

const env = [
	`PUBLIC_VAPID_KEY=${keys.publicKey}`,
	`PRIVATE_VAPID_KEY=${keys.privateKey}`,
	`PUBLIC_VAPID_SUBJECT=${PUBLIC_VAPID_SUBJECT}`,
	`DATABASE_URL=${DATABASE_URL}`,
	`MODE=${MODE}`,
	`ADMIN_PASSWORD=${ADMIN_PASSWORD}`,
	'ORIGIN=https://localhost:5173/',
	''
].join('\n');

writeFileSync(outputPath, env);

console.log(`Generated: ${outputPath}`);
console.log(
	'Keys: PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY, PUBLIC_VAPID_SUBJECT, DATABASE_URL, MODE, ADMIN_PASSWORD'
);
