import { formatUserLocalDate } from '$lib/utils/common';

export function formatDate(dateStr: string | null) {
	return dateStr ? formatUserLocalDate(dateStr) : '—';
}
