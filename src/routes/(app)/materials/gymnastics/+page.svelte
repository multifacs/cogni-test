<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let sex: string | undefined = $state('male');

	onMount(() => {
		console.log(data.user?.sex);
		sex = data.user?.sex;
	});
</script>

<main class="prose prose-invert mx-auto max-w-2xl overflow-scroll p-6">
	<h1 class="code-line" data-line-start="0" data-line-end="1">Гимнастика для шейного отдела</h1>
	<p class="has-line-data" data-line-start="2" data-line-end="3">
		Регулярная зарядка (не профессиональный спорт) улучшает когнитивные функции за счет:
	</p>
	<ul>
		<li class="has-line-data" data-line-start="3" data-line-end="4">
			Нормализации кровоснабжения
		</li>
		<li class="has-line-data" data-line-start="4" data-line-end="6">
			Увеличения тонуса организма
		</li>
	</ul>
	<p class="has-line-data" data-line-start="6" data-line-end="14">
		<strong>Польза гимнастики для шейного отдела:</strong><br />
		✔ Нормализует внутричерепное давление<br />
		✔ Улучшает зрение, слух и память<br />
		✔ Повышает работоспособность<br />
		✔ Восстанавливает вестибулярный аппарат<br />
		✔ Улучшает состояние щитовидной железы<br />
		✔ Нормализует сон<br />
		✔ Улучшает питание мозга
	</p>
	<hr />
	<h2 class="code-line" data-line-start="17" data-line-end="18">Упражнение 1</h2>
	<p class="has-line-data" data-line-start="18" data-line-end="19">
		<strong>Исходное положение:</strong> Корпус прямой, подбородок опущен на грудь.
	</p>
	<p class="has-line-data" data-line-start="20" data-line-end="21">
		<strong>Техника выполнения:</strong>
	</p>
	<ol>
		<li class="has-line-data" data-line-start="21" data-line-end="22">
			Подбородок скользит вниз по груди к поясу
		</li>
		<li class="has-line-data" data-line-start="22" data-line-end="23">
			Чередуем напряжение и легкое расслабление
		</li>
		<li class="has-line-data" data-line-start="23" data-line-end="25">
			С каждым повтором немного увеличиваем усилие
		</li>
	</ol>
	<p class="has-line-data" data-line-start="25" data-line-end="26">
		⚠ <strong>Важно!</strong> В шее должно быть напряжение, но не боль. При проблемах с шейным отделом
		замените на вытягивание подбородка вперед.
	</p>
	<p class="has-line-data" data-line-start="27" data-line-end="28">
		<strong>Повторения:</strong> 15 раз (через 1-2 недели можно увеличить до 30)
	</p>
	{#if sex == 'male'}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex1-m.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{:else}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex1-f.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{/if}
	<hr />
	<h2 class="code-line" data-line-start="31" data-line-end="32">Упражнение 2</h2>
	<p class="has-line-data" data-line-start="32" data-line-end="33">
		<strong>Исходное положение:</strong> Корпус прямой, плечи выпрямлены.
	</p>
	<p class="has-line-data" data-line-start="34" data-line-end="35">
		<strong>Техника выполнения:</strong>
	</p>
	<ol>
		<li class="has-line-data" data-line-start="35" data-line-end="36">
			Слегка отклоняем голову назад (не запрокидываем!)
		</li>
		<li class="has-line-data" data-line-start="36" data-line-end="37">
			Тянем подбородок вверх
		</li>
		<li class="has-line-data" data-line-start="37" data-line-end="38">
			Задерживаем на 1 секунду
		</li>
		<li class="has-line-data" data-line-start="38" data-line-end="40">
			Чуть отпускаем напряжение и снова тянемся
		</li>
	</ol>
	<p class="has-line-data" data-line-start="40" data-line-end="41">
		<strong>Повторения:</strong> 15 раз
	</p>
	{#if sex == 'male'}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex2-m.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{:else}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex2-f.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{/if}
	<hr />
	<h2 class="code-line" data-line-start="44" data-line-end="45">Упражнение 3</h2>
	<p class="has-line-data" data-line-start="45" data-line-end="46">
		<strong>Исходное положение:</strong> Позвоночник прямой, плечи неподвижны.
	</p>
	<p class="has-line-data" data-line-start="47" data-line-end="48">
		<strong>Техника выполнения:</strong>
	</p>
	<ol>
		<li class="has-line-data" data-line-start="48" data-line-end="49">
			Наклоняем голову вправо (не поворачиваем!)
		</li>
		<li class="has-line-data" data-line-start="49" data-line-end="50">
			Пытаемся коснуться правого плеча
		</li>
		<li class="has-line-data" data-line-start="50" data-line-end="51">
			Возвращаемся в исходное положение
		</li>
		<li class="has-line-data" data-line-start="51" data-line-end="53">
			Повторяем в левую сторону
		</li>
	</ol>
	<p class="has-line-data" data-line-start="53" data-line-end="54">
		Со временем амплитуда увеличится.
	</p>
	<p class="has-line-data" data-line-start="55" data-line-end="56">
		<strong>Повторения:</strong> 10 раз в каждую сторону
	</p>
	{#if sex == 'male'}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex3-m.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{:else}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex3-f.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{/if}
	<hr />
	<h2 class="code-line" data-line-start="59" data-line-end="60">Упражнение 4 (“Щенок”)</h2>
	<p class="has-line-data" data-line-start="60" data-line-end="61">
		<strong>Исходное положение:</strong> Корпус прямой, голова перед собой.
	</p>
	<p class="has-line-data" data-line-start="62" data-line-end="63">
		<strong>Техника выполнения:</strong>
	</p>
	<ol>
		<li class="has-line-data" data-line-start="63" data-line-end="67">
			Вращаем голову вокруг носа как вокруг оси:
			<ul>
				<li class="has-line-data" data-line-start="64" data-line-end="65">
					Подбородок → вправо-вверх
				</li>
				<li class="has-line-data" data-line-start="65" data-line-end="66">
					Макушка → влево-вниз
				</li>
				<li class="has-line-data" data-line-start="66" data-line-end="67">
					Глаза смотрят вверх
				</li>
			</ul>
		</li>
		<li class="has-line-data" data-line-start="67" data-line-end="69">
			Повторяем в противоположную сторону
		</li>
	</ol>
	<p class="has-line-data" data-line-start="69" data-line-end="70">
		<strong>Варианты выполнения:</strong>
	</p>
	<ul>
		<li class="has-line-data" data-line-start="70" data-line-end="71">
			Голова ровно (смотрим перед собой)
		</li>
		<li class="has-line-data" data-line-start="71" data-line-end="72">
			Голова опущена (смотрим в пол)
		</li>
		<li class="has-line-data" data-line-start="72" data-line-end="74">
			Голова отклонена назад (смотрим в потолок)
		</li>
	</ul>
	<p class="has-line-data" data-line-start="74" data-line-end="75">
		<strong>Повторения:</strong> 15 раз
	</p>
	{#if sex == 'male'}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex4-m.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{:else}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex4-f.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{/if}
	<hr />
	<h2 class="code-line" data-line-start="78" data-line-end="79">Упражнение 5</h2>
	<p class="has-line-data" data-line-start="79" data-line-end="80">
		<strong>Исходное положение:</strong> Корпус прямой, голова на линии с позвоночником.
	</p>
	<p class="has-line-data" data-line-start="81" data-line-end="82">
		<strong>Техника выполнения:</strong>
	</p>
	<ol>
		<li class="has-line-data" data-line-start="82" data-line-end="83">
			Медленно уводим взгляд вправо
		</li>
		<li class="has-line-data" data-line-start="83" data-line-end="84">
			Поворачиваем голову до упора
		</li>
		<li class="has-line-data" data-line-start="84" data-line-end="85">
			Пытаемся увидеть, что за спиной
		</li>
		<li class="has-line-data" data-line-start="85" data-line-end="87">Плавно возвращаемся</li>
	</ol>
	<p class="has-line-data" data-line-start="87" data-line-end="88">
		<strong>Повторения:</strong> 5-10 раз в каждую сторону
	</p>
	{#if sex == 'male'}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex5-m.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{:else}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex5-f.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{/if}
	<hr />
	<h2 class="code-line" data-line-start="91" data-line-end="92">
		Упражнение 6 (Круговые движения)
	</h2>
	<p class="has-line-data" data-line-start="92" data-line-end="93">
		<strong>Техника выполнения:</strong>
	</p>
	<ol>
		<li class="has-line-data" data-line-start="93" data-line-end="98">
			Медленные перекаты головы:
			<ul>
				<li class="has-line-data" data-line-start="94" data-line-end="95">
					Подбородок → к грудине
				</li>
				<li class="has-line-data" data-line-start="95" data-line-end="96">
					К правому плечу
				</li>
				<li class="has-line-data" data-line-start="96" data-line-end="97">
					Затылок → к спине
				</li>
				<li class="has-line-data" data-line-start="97" data-line-end="98">
					К левому плечу
				</li>
			</ul>
		</li>
		<li class="has-line-data" data-line-start="98" data-line-end="100">
			Повторяем в обратном направлении
		</li>
	</ol>
	<p class="has-line-data" data-line-start="100" data-line-end="102">
		<strong>При проблемах с шеей:</strong><br />
		Выполняем без наклона назад, только боковые наклоны.
	</p>
	<p class="has-line-data" data-line-start="103" data-line-end="104">
		<strong>Повторения:</strong> 5-7 раз в каждую сторону
	</p>
	{#if sex == 'male'}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex6-m.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{:else}
		<video width="400" height="400" autoplay loop>
			<track kind="captions" />
			<source src="ex6-f.mp4" type="video/mp4" />
			Ваш браузер не поддерживает видео.
		</video>
	{/if}
</main>
