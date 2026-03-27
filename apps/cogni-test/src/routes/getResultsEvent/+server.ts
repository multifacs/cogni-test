import { produce } from 'sveltekit-sse';
import { delay } from '$lib/utils';


export function POST() {
	return produce(async function start({ emit }) {
		while (true) {
			const { error } = emit('message', `the time is ${Date.now()}`);
			if (error) {
				return;
			}
			await delay(1000);
		}
	});
}
