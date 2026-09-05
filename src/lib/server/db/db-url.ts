export type DatabaseUrlClassification =
	| { mode: 'unset' }
	| { mode: 'memory' }
	| { mode: 'file'; path: string }
	| { mode: 'remote' };

export function classifyDatabaseUrl(url: string | undefined): DatabaseUrlClassification {
	if (url === undefined || url === '') {
		return { mode: 'unset' };
	}

	if (url === ':memory:' || url.startsWith('file::memory:')) {
		return { mode: 'memory' };
	}

	if (url.startsWith('file:')) {
		return { mode: 'file', path: url.slice('file:'.length) };
	}

	return { mode: 'remote' };
}
