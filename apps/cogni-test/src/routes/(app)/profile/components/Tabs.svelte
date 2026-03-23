<script lang="ts">
	// Svelte 5 props
	let {
		tabs = [],
		activeTab = $bindable(),
		onTabChange = () => {},
		children
	}: {
		tabs: { id: string; label: string; disabled?: boolean }[];
		activeTab: string;
		onTabChange?: (id: string) => void;
		children: any;
	} = $props();
</script>

<ul
	class="text-body grid gap-1 grid-cols-3 grid-rows-2 text-center text-sm font-medium sm:grid-cols-5 sm:grid-rows-1"
>
	{#each tabs as tab}
		<li class="me-2">
			<button
				class="
                inline-block
                w-full
                cursor-pointer
                overflow-hidden
                rounded-sm
                px-4
                py-2.5
                text-ellipsis
                "
				class:text-fg-disabled={tab.disabled}
				class:cursor-not-allowed={tab.disabled}
				class:bg-blue-600={!tab.disabled && activeTab === tab.id}
				class:text-white={!tab.disabled && activeTab === tab.id}
				class:font-bold={!tab.disabled && activeTab === tab.id}
				class:hover:text-heading={!tab.disabled && activeTab !== tab.id}
				class:hover:bg-gray-600={!tab.disabled && activeTab !== tab.id}
				class:bg-blue-900={!tab.disabled && activeTab !== tab.id}
				onclick={() => {
					console.log(activeTab);
					return !tab.disabled && onTabChange(tab.id);
				}}
				disabled={tab.disabled}
			>
				{tab.label}
			</button>
		</li>
	{/each}
</ul>

<!-- Content -->
<div class="mt-4 w-full">
	{@render children()}
</div>
