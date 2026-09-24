# Реестр вычислений метрик

Этот файл — реестр всех вычислений метрик продукта: что вычисляется, где в коде и какая формула используется сейчас. Колонку «Что должно быть» заполняет продукт (Даша) — краткой математической записью, по одной формуле на строку. Разработчики затем выверяют вычисления по этому файлу и пишут тесты.

Пайплайн в одну строку: игра (attempts) → `computeSessionScore()` (скор одной сессии) → `getMetricScores()` (усреднение в 13 метрик) → `getMetricShares()` (доли для доната на /home и /metrics).

## Общее

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Доля каждой метрики (для доната на /home и /metrics) | `src/lib/shared/metricShares.ts:37 — getMetricShares()` | `share = score метрики / Σ всех scores`; если Σ scores = 0 — возвращается пустой массив (UI показывает заглушку) | |

## executive_function

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «stroop» (Цвет и смысл) | `src/lib/shared/metrics.ts:36 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «swallow» (Полет птицы) | `src/lib/shared/metrics.ts:39 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «nback-stream» (Повторы в ряду; тип сессии `nbackExercise`) | `src/lib/shared/metrics.ts:48 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## memory

*Нет кормящих тестов — метрика всегда 0.*

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## attention

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «stroop» (Цвет и смысл) | `src/lib/shared/metrics.ts:37 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «math» (Быстрый счет) | `src/lib/shared/metrics.ts:36 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «munsterberg» (Поиск слов) | `src/lib/shared/metrics.ts:53 — computeSessionScore()` (кейс munsterberg) | `round(guessed / total × 100)` — доля «угаданных» попыток от всех попыток сессии ⚠️ guessed считается от всех попыток сессии, включая незавершённые/пропущенные | |
| Скор сессии теста «campimetry» (Скрытая фигура) | `src/lib/shared/metrics.ts:58 — computeSessionScore()` (кейс campimetry) | `min(100, round(maxStage / 2 × 100))` — максимальная достигнутая стадия, делённая на 2 ⚠️ почему именно деление на 2 — потолок 100 достигается уже со стадии 2 | |
| Скор сессии теста «memory» (Слова и повторы) | `src/lib/shared/metrics.ts:38 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «word-morphing» (Цепочка слов; тип сессии `wordMorphingExercise`) | `src/lib/shared/metrics.ts:47 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «campimetry» (Поле зрения; тип сессии `campimetryExercise`) | `src/lib/shared/metrics.ts:59 — computeSessionScore()` (кейс campimetry) | `min(100, round(maxStage / 2 × 100))` — максимальная достигнутая стадия, делённая на 2 ⚠️ почему именно деление на 2 — потолок 100 достигается уже со стадии 2 | |
| Скор сессии упражнения «memory-match» (Найди пару; тип сессии `memoryMatchExercise`) | `src/lib/shared/metrics.ts:64 — computeSessionScore()` (кейс memoryMatchExercise) | `round(efficiency последней попытки)` — берётся только последняя попытка массива ⚠️ учитывается только последняя попытка, предыдущие игнорируются | |
| Скор сессии упражнения «nback-stream» (Повторы в ряду; тип сессии `nbackExercise`) | `src/lib/shared/metrics.ts:48 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## thinking

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «stroop» (Цвет и смысл) | `src/lib/shared/metrics.ts:37 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «math» (Быстрый счет) | `src/lib/shared/metrics.ts:36 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «word-morphing» (Цепочка слов; тип сессии `wordMorphingExercise`) | `src/lib/shared/metrics.ts:47 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## perception

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «munsterberg» (Поиск слов) | `src/lib/shared/metrics.ts:53 — computeSessionScore()` (кейс munsterberg) | `round(guessed / total × 100)` — доля «угаданных» попыток от всех попыток сессии ⚠️ guessed считается от всех попыток сессии, включая незавершённые/пропущенные | |
| Скор сессии теста «campimetry» (Скрытая фигура) | `src/lib/shared/metrics.ts:58 — computeSessionScore()` (кейс campimetry) | `min(100, round(maxStage / 2 × 100))` — максимальная достигнутая стадия, делённая на 2 ⚠️ почему именно деление на 2 — потолок 100 достигается уже со стадии 2 | |
| Скор сессии упражнения «word-morphing» (Цепочка слов; тип сессии `wordMorphingExercise`) | `src/lib/shared/metrics.ts:47 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «campimetry» (Поле зрения; тип сессии `campimetryExercise`) | `src/lib/shared/metrics.ts:59 — computeSessionScore()` (кейс campimetry) | `min(100, round(maxStage / 2 × 100))` — максимальная достигнутая стадия, делённая на 2 ⚠️ почему именно деление на 2 — потолок 100 достигается уже со стадии 2 | |
| Скор сессии упражнения «nback-stream» (Повторы в ряду; тип сессии `nbackExercise`) | `src/lib/shared/metrics.ts:48 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## reaction_speed

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «math» (Быстрый счет) | `src/lib/shared/metrics.ts:36 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «memory» (Слова и повторы) | `src/lib/shared/metrics.ts:38 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## verbal_function

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «munsterberg» (Поиск слов) | `src/lib/shared/metrics.ts:53 — computeSessionScore()` (кейс munsterberg) | `round(guessed / total × 100)` — доля «угаданных» попыток от всех попыток сессии ⚠️ guessed считается от всех попыток сессии, включая незавершённые/пропущенные | |
| Скор сессии теста «memory» (Слова и повторы) | `src/lib/shared/metrics.ts:38 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## spacial_perception

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «swallow» (Полет птицы) | `src/lib/shared/metrics.ts:39 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «memory-match» (Найди пару; тип сессии `memoryMatchExercise`) | `src/lib/shared/metrics.ts:64 — computeSessionScore()` (кейс memoryMatchExercise) | `round(efficiency последней попытки)` — берётся только последняя попытка массива ⚠️ учитывается только последняя попытка, предыдущие игнорируются | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## spacial_orientation

*Нет кормящих тестов — метрика всегда 0.*

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## short_memory

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «stroop» (Цвет и смысл) | `src/lib/shared/metrics.ts:37 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «memory» (Слова и повторы) | `src/lib/shared/metrics.ts:38 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии теста «swallow» (Полет птицы) | `src/lib/shared/metrics.ts:39 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «word-morphing» (Цепочка слов; тип сессии `wordMorphingExercise`) | `src/lib/shared/metrics.ts:47 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «memory-match» (Найди пару; тип сессии `memoryMatchExercise`) | `src/lib/shared/metrics.ts:64 — computeSessionScore()` (кейс memoryMatchExercise) | `round(efficiency последней попытки)` — берётся только последняя попытка массива ⚠️ учитывается только последняя попытка, предыдущие игнорируются | |
| Скор сессии упражнения «nback-stream» (Повторы в ряду; тип сессии `nbackExercise`) | `src/lib/shared/metrics.ts:48 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## working_memory

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «memory» (Слова и повторы) | `src/lib/shared/metrics.ts:38 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Скор сессии упражнения «word-morphing» (Цепочка слов; тип сессии `wordMorphingExercise`) | `src/lib/shared/metrics.ts:47 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## long_memory

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии упражнения «word-morphing» (Цепочка слов; тип сессии `wordMorphingExercise`) | `src/lib/shared/metrics.ts:47 — computeSessionScore()` (accuracy-кейс, строки 36–51) | `round(correct / total × 100)` — доля правильных попыток от всех попыток сессии | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |

## color_perception

| Что вычисляется | Где | Что сейчас происходит | Что должно быть |
| --- | --- | --- | --- |
| Скор сессии теста «campimetry» (Скрытая фигура) | `src/lib/shared/metrics.ts:58 — computeSessionScore()` (кейс campimetry) | `min(100, round(maxStage / 2 × 100))` — максимальная достигнутая стадия, делённая на 2 ⚠️ почему именно деление на 2 — потолок 100 достигается уже со стадии 2 | |
| Скор сессии упражнения «campimetry» (Поле зрения; тип сессии `campimetryExercise`) | `src/lib/shared/metrics.ts:59 — computeSessionScore()` (кейс campimetry) | `min(100, round(maxStage / 2 × 100))` — максимальная достигнутая стадия, делённая на 2 ⚠️ почему именно деление на 2 — потолок 100 достигается уже со стадии 2 | |
| Агрегация метрики | `src/lib/shared/metrics.ts:75 — getMetricScores()` | среднее скоров всех сессий всех кормящих тестов (сессии всех тестов смешиваются в один массив и усредняются) | |
