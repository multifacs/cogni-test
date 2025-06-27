<script lang="ts">
	import { userStore } from '$lib/stores/user';

	const user = $userStore;
	const userName = $state(`${user?.firstname} ${user?.lastname}`);
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
		{#if user}
			<span>
				{userName}
			</span>
		{:else}
			<span>- - -</span>
		{/if}
	</span>
</div>
