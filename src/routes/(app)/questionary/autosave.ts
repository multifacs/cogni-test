import { get } from 'svelte/store';
import { profileSurveyStore } from '$lib/stores/user';

const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function sendField(key: string, value: unknown) {
	try {
		const fd = new FormData();
		if (typeof value === 'boolean') {
			fd.append(key, value ? '1' : '0');
		} else if (value !== null && value !== undefined) {
			fd.append(key, String(value));
		} else {
			return;
		}

		const res = await fetch('/?/save', { method: 'POST', body: fd });
		if (!res.ok) throw new Error(`Save failed: ${res.status}`);
	} catch (e) {
		console.error('[autosave] failed for', key, e);
	}
}

export function saveFieldNow(key: string) {
	const snapshot = get(profileSurveyStore);
	if (!snapshot) return;
	const value = (snapshot as Record<string, unknown>)[key];
	return sendField(key, value);
}

export function saveFieldDebounced(key: string, delay = 600) {
	const existing = timers.get(key);
	if (existing) clearTimeout(existing);
	timers.set(
		key,
		setTimeout(() => {
			timers.delete(key);
			saveFieldNow(key);
		}, delay)
	);
}

export function flushAutosave() {
	for (const t of timers.values()) clearTimeout(t);
	timers.clear();
}