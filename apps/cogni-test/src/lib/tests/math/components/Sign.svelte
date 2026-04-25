<script lang="ts">
	import type { Sign } from '../types';

	let {
		sign = '!='
	}: {
		sign: Sign | null;
	} = $props();

	type MathSignSources = Sign;

	if (!sign) sign = '!=';

	const srcs: {
		[key in MathSignSources]: string;
	} = {
		'=': '/math/equals.svg',
		'!=': '/math/not-equal.svg',
		'>': '/math/greater-than.svg',
		'<': '/math/less-than.svg',
		'>=': '/math/greater-than-equal.svg',
		'<=': '/math/less-than-equal.svg'
	};
</script>

<!-- <img src={srcs[sign]} class={`w-8 invert-100 ${sign ? 'block' : 'hidden'}`} alt={srcs[sign]} /> -->
<span class={`w-8 invert-100 ${sign ? 'block' : 'hidden'}`}>{sign}</span>
