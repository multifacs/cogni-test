export declare const parse: (
	str: string,
	options?: { decode?: (value: string) => string }
) => Record<string, string>;

export declare const serialize: (
	name: string,
	value: string,
	options?: Record<string, unknown>
) => string;

declare const cookie: { parse: typeof parse; serialize: typeof serialize };

export default cookie;
