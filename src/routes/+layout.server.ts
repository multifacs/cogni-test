import { MODE } from '$env/static/private';

console.log("mode: " + MODE);

export const load = async () => {
	const TG_GROUP_LINK = 'https://t.me/+Q08ShGg2nSRhYTEy';
	return {
		MODE,
		TG_GROUP_LINK
	};
};
