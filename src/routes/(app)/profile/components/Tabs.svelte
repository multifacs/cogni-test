<script lang="ts">
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

	function handleClick(tab: { id: string; disabled?: boolean }) {
		if (!tab.disabled) {
			onTabChange(tab.id);
			activeTab = tab.id;
		}
	}
</script>

<div class="w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
	<div
		role="tablist"
		class="flex w-full gap-1 border-b border-gray-700 px-4 pt-4 pb-2 text-sm font-medium"
	>
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				id="profile-tab-{tab.id}"
				aria-selected={activeTab === tab.id}
				aria-controls="profile-panel-{tab.id}"
				tabindex={activeTab === tab.id ? 0 : -1}
				aria-disabled={tab.disabled}
				class="inline-flex shrink-0 items-center justify-center rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors duration-200 max-md:flex-1 max-md:px-1 max-md:text-xs"
				class:bg-blue-600={!tab.disabled && activeTab === tab.id}
				class:text-white={!tab.disabled && activeTab === tab.id}
				class:font-semibold={!tab.disabled && activeTab === tab.id}
				class:bg-gray-700={!tab.disabled && activeTab !== tab.id}
				class:text-gray-300={!tab.disabled && activeTab !== tab.id}
				class:hover:bg-gray-600={!tab.disabled && activeTab !== tab.id}
				class:hover:text-gray-200={!tab.disabled && activeTab !== tab.id}
				class:opacity-50={tab.disabled}
				class:cursor-not-allowed={tab.disabled}
				onclick={() => handleClick(tab)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="w-full p-4">
		{@render children()}
	</div>
</div>
