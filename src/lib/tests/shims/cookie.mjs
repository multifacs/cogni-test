import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Vitest's configEnvironment hook replaces resolve.external with builtins and
// forces noExternal=true, so CJS packages get inlined into Vite's SSR module
// runner without CJS globals ("exports is not defined"). This ESM shim loads
// the real CJS cookie package natively instead of letting Vite inline it.

const require = createRequire(import.meta.url);

/**
 * @returns {import('cookie')} the cookie@0.x module (parse/serialize API)
 */
function load_cookie() {
	// Preferred: the hoisted copy at the project root (cookie@0.6.x).
	try {
		const cookie = require('cookie');
		if (typeof cookie.parse === 'function' && typeof cookie.serialize === 'function') {
			return cookie;
		}
	} catch {
		// not resolvable from here — try kit's own copy below
	}

	// Fallback: @sveltejs/kit's nested copy (kit depends on cookie@^0.6.0).
	// This covers the state where npm keeps cookie nested under
	// node_modules/@sveltejs/kit/node_modules/cookie.
	const kit_root = dirname(require.resolve('@sveltejs/kit/package.json'));
	const cookie = createRequire(join(kit_root, 'package.json'))('cookie');
	if (typeof cookie.parse === 'function' && typeof cookie.serialize === 'function') {
		return cookie;
	}

	let resolved_path;
	try {
		resolved_path = require.resolve('cookie', { paths: [kit_root] });
	} catch {
		resolved_path = '<unknown>';
	}

	throw new Error(
		`cookie shim: resolved a cookie package without parse/serialize (got ${resolved_path}); expected cookie@0.6.x — run npm install`
	);
}

const cookie = load_cookie();

export const parse = cookie.parse;
export const serialize = cookie.serialize;
// default export — in case any code uses `import cookie from 'cookie'`
export default cookie;
