<script lang="ts">
	export let userId: string = '';
	console.log('userId', userId);
</script>

<div
	class="text-teal xs:p-2 xs:max-lg:landscape:text-xs inline-flex items-center rounded-full bg-gray-50 p-1 text-[10px] leading-none shadow sm:text-sm"
>
	<span
		class="inline-flex h-6 items-center justify-center rounded-full bg-indigo-700 px-3 text-gray-50"
	>
		<span class="hidden sm:block"> User ID: </span>
		<span class="block sm:hidden"> ID: </span>
	</span>
	<span class="flex flex-col px-2 text-indigo-700">
		{#if userId}
			<span class="hidden sm:block">
				{userId}
			</span>
			<span class="block sm:hidden">
				{userId.slice(0, 18)}
			</span>
			<span class="block sm:hidden">
				{userId.slice(19, 36)}
			</span>
		{:else}
			<span>- - -</span>
		{/if}
	</span>
</div>
