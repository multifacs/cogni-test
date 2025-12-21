<script lang="ts">
    import { user as userStore } from "$lib/userStore";
	import { derived } from 'svelte/store';

	const userName = derived(userStore, ($userStore) => {
		if ($userStore) return `${$userStore.firstname} ${$userStore.lastname}`;
		return '- - -';
	});
</script>

<div
	class="
	text-teal
	max-xs:text-xs
	xs:text-base
	xs:max-lg:landscape:text-xs
	inline-flex
	items-center
	rounded-full
	bg-gray-50
	px-4
	py-2
	shadow
	"
>
	👤
	<span class="flex flex-col px-2 text-indigo-700">
		{$userName}
	</span>
</div>
