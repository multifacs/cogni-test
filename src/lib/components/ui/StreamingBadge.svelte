<!--
	StreamingBadge — красный статус-индикатор потокового прохождения тестов.
	Презентационный, без пропсов: рендерится Header'ом. Видимость определяет
	Header: активный streaming store (очередь непуста) + роут /tests/* +
	не-GTO (нет gtoSessionId в URL). Позиционирование и z-index задаёт
	Header (absolute-оверлей в banner, z-10 — ниже Toast z-50); сам
	компонент их не навязывает.
	Единственная анимация — пульс точки (frontend-philosophy: один motion,
	одна идея); prefers-reduced-motion её отключает.
-->
<div
	role="status"
	class="flex items-center gap-2 rounded-full bg-red-600/80 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
>
	<span class="streaming-dot" aria-hidden="true"></span>
	<span>Потоковое прохождение</span>
</div>

<style>
	/* Ярко-красная точка с тонким белым кантом: читается на red-600/80 пилюле */
	.streaming-dot {
		display: block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background-color: #ff5c49;
		box-shadow: 0 0 0 2px rgb(255 255 255 / 0.35);
		animation: streaming-dot-pulse 1.5s ease-in-out infinite;
	}

	@keyframes streaming-dot-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.streaming-dot {
			animation: none;
		}
	}
</style>
