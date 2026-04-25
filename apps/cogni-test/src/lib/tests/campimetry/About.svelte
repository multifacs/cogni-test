<script lang="ts">
	import { getCSSVar, translate } from '$lib/utils';
	import { colors } from './logic/lab-color.svelte';
</script>

<!-- <p>Тест включает в себя ограниченный набор цветов:</p>
<p class="font-bold">
	{#each Object.keys(colors).slice(0, -1) as color}
		<span style={`color: ${getCSSVar(`--camp-${color}`)}`}>{translate(color)}{`, `}</span>
	{/each}
	<span style={`color: ${getCSSVar(`--camp-${Object.keys(colors).slice(-1)[0]}`)}`}
		>{translate(Object.keys(colors).slice(-1)[0])}.</span
	>
</p> -->
<p>
	<b>Первый этап.</b> На экране отображен цветной квадрат и ниже силуэты фигурок для выбора. Необходимо
	нажимать на кнопку «Проявить фигуру», чтобы прибавлять оттенок (яркость) силуэту. Когда фигурка становится
	распознаваемой, нужно нажать на верный силуэт из предложенных ниже. Всего будет предложено 10 вариантов.
</p>
<p>
	<b>Второй этап.</b> На экране отображен цветной квадрат с силуэтом. Ваша задача – нажимать на кнопку
	«Скрыть фигуру» до того момента, пока Вы не перестанете различать силуэт на экране.
</p>
