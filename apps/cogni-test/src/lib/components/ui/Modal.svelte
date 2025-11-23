<script lang="ts">
	let { showModal = $bindable(), header, children } = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (showModal && dialog) {
			dialog.showModal();
		}
	});
</script>

<dialog
	class="fixed inset-0 z-999 grid min-h-screen min-w-screen place-items-center bg-black/50 text-justify backdrop-blur-sm"
	bind:this={dialog}
	onclose={() => (showModal = false)}
	onclick={(e) => {
		if (e.target === dialog) dialog.close();
	}}
>
	<div
		class="relative m-4 w-full max-w-[90vw] rounded-lg bg-gray-900 p-4 shadow-sm md:w-2/5 md:max-w-[50%] md:min-w-[25%]"
	>
		{@render header?.()}
		<hr class="my-4 h-px bg-gray-900" />
		{@render children?.()}
	</div>
</dialog>

<style>
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
