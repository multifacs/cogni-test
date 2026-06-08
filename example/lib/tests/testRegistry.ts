export const testRegistry = {
    emoji: {
        title: "Тест на смену эмодзи",
        description: "Определите, изменился ли эмодзи или остался прежним",
        component: () => import("$lib/tests/EmojiTest.svelte")

    },
    attention: {
        title: "Тест на внимание",
        description: "Найти m из n чисел как можно быстрее",
        component: () => import("$lib/tests/Attention.svelte")
    },
    memory1: {
        title: "Тест на память",
        description: "Запоминайте содержимое картинок",
        component: () => import("$lib/tests/Memory1.svelte")
    },
    memory2: {
        title: "Запоминание чисел",
        description: "Запомните последовательность чисел и воспроизведите её в том же порядке",
        component: () => import("$lib/tests/NumberMemory.svelte")
    },
    flanker: {
        title: "Фланговый тест Эриксена",
        description: "Измерение концентрации и скорости обработки данных",
        component: () => import("$lib/tests/FlankerTest.svelte")
    },
    letter: {
        title: "Буквенный охват",
        description: "На короткое время показывается набор букв — запомните их порядок.",
        component: () => import("$lib/tests/LetterCoverageTest.svelte")
    }
}