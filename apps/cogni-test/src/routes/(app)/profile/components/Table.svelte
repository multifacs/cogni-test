<script>
	let { children } = $props();
</script>

<div class="min-w-full">
	<div
		class="overflow-x-auto rounded-sm border border-blue-200"
	>
		<table class="min-w-full">
			<tbody class="">
				{@render children()}
			</tbody>
		</table>
	</div>
</div>
