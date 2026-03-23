<script>
	let { children } = $props();
</script>

<div class="min-w-full">
	<div
		class="overflow-x-auto rounded-sm border border-blue-200 bg-blue-50
		[&::-webkit-scrollbar]:h-2
		[&::-webkit-scrollbar-thumb]:rounded-sm
		[&::-webkit-scrollbar-thumb]:bg-blue-300
		[&::-webkit-scrollbar-track]:bg-blue-100"
	>
		<table class="min-w-full divide-y divide-blue-200">
			<tbody class="divide-y divide-blue-200">
				{@render children()}
			</tbody>
		</table>
	</div>
</div>
