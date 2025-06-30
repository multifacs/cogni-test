<script lang="ts">
	import { getCSSVar, translate } from '$lib/utils';
	import { onMount } from 'svelte';
	import { colors } from './logic/lab-color.svelte';
</script>

<p>Тест включает в себя полный набор цветов:</p>
<p class="font-bold">
	{#each Object.keys(colors).slice(0, -1) as color}
		<span style={`color: ${getCSSVar(`--camp-${color}`)}`}>{translate(color)}{`, `}</span>
	{/each}
	<span style={`color: ${getCSSVar(`--camp-${Object.keys(colors).slice(-1)[0]}`)}`}
		>{translate(Object.keys(colors).slice(-1)[0])}.</span
	>
</p>
<p>
	<b>Первый этап.</b> На экране отображен фон и чей-то силуэт одного и того же цвета. Необходимо нажимать
	на кнопку «Добавить оттенок», чтобы прибавлять оттенок силуэту. Когда фигурка становится распознаваемой,
	нужно нажать на верный силуэт из предложенных.
</p>
<p>
	<b>Второй этап.</b> На экране все тот же фон и тот же силуэт, но уже отклонение от цвета фона определено
	не нажатиями на кнопку «Добавить оттенок», а от программно заданного числа шагов.
</p>
