Привет! Из файлов вижу два документа по комплексу **«Ментально готов к труду и обороне» (ГТО-М)**:

1. **Сертификат ЗОЛОТО** [1] — наградной лист с координационным советом и печатями.
2. **Таблица результатов** [2] — 10 показателей (скорость принятия решений, моторная реакция, память, равновесие, лабиринт, Мюнстерберг, когнитивный конфликт, фигуры, логика) с колонками: результат пользователя, рейтинг в приложении («лучше, чем X%») и нормативы для трёх ступеней (золото/серебро/бронза) для конкретной возрастно-половой группы.

Пользовательские переменные, которые я уже могу выделить из таблицы для Svelte (предварительно):

```ts
// Пример интерфейса данных из приложения
interface GtoMResult {
  userId: string;           // "ID 0095"
  userName: string;           // "София"
  ageGroup: string;           // "женщины 35-39 лет"
  badge: 'gold' | 'silver' | 'bronze'; // общий знак
  
  decisions: { speedSec: number; correctPct: number; rankPct: number; };
  motorReaction: { rightMs: number | null; leftMs: number | null; rankPct: number | null; };
  shortTermMemory: { speedSec: number; correctPct: number; rankPct: number; };
  delayedMemory: { wordsCount: number; rankPct: number; };
  balance: { durationSec: number | string; rankPct: number; }; // "60+"
  labyrinth: { points: number; rankPct: number; };
  munsterberg: { foundPct: number; rankPct: number; };
  cognitiveConflict: { speedSec: number; correctPct: number; rankPct: number; };
  figureMatching: { speedSec: number; correctPct: number; rankPct: number; };
  logic: { points: number; rankPct: number; };
  
  // Нормативы (обычно статичны для группы, но могут приходить из API)
  norms: Record<'gold' | 'silver' | 'bronze', NormValues>;
}
```

Прежде чем написать точную инструкцию для генерации HTML, мне нужно уточнить несколько ключевых моментов: 
Привет! Ниже разбор файлов и детальное ТЗ для OpenDesign. Я разбил на два Svelte-компонента: **таблица результатов** и **сертификат**. Все личные данные заменены на пропсы/переменные.

---

## 1. Что внутри файлов

**Таблица результатов** [2] — 10 нормативов ГТО-М, каждый содержит:
- результат пользователя (скорость, точность, баллы, слова);
- сравнение с другими пользователями («Вы лучше, чем X%»);
- нормативы для конкретной возрастно-половой группы (на примере: женщины 35–39 лет) в три ступени: Золото, Серебро, Бронза.

**Сертификат** [1] — наградной лист с номером, именем, присвоенным знаком (золото/серебро/бронза) и реквизитами координационного совета. Вероятно, используется для печати/PDF.

---

## 2. Типизация данных для Svelte

Передай OpenDesign эту схему — пусть генерирует компоненты с такими пропсами:

```ts
// === Общие типы ===
type Badge = 'gold' | 'silver' | 'bronze';

interface Norms {
  gold: string;   // например "1.43 с 100%"
  silver: string; // например "1.65 с 100%"
  bronze: string; // например "1.9 с 80%"
}

interface ResultRow {
  id: string;
  order: number;
  title: string;        // жирный текст норматива
  subtitle: string;     // пояснение в скобках, например "(средняя скорость в с., % правильных ответов)"
  userResult: string;   // отформатированный результат: "1,41 с, 100%" или "—"
  ratingPercent: number | null; // null → "Нет данных для рейтинга"
  ratingLabel?: string; // fallback-шаблон, если нужно переопределить
  norms: Norms;
  subRows?: SubRow[];   // для моторной реакции (правая/левая)
}

interface SubRow {
  label: string;        // "правая рука", "левая рука"
  userResult: string;   // результат или "—"
  norms: Norms;
}

interface UserProfile {
  id: string;           // "0095"
  name: string;         // "София"
  groupLabel: string;   // "женщины 35–39 лет"
  badge: Badge;
}

// === Пропсы таблицы ===
export let user: UserProfile;
export let results: ResultRow[];

// === Пропсы сертификата ===
export let certNumber: string;      // "0095"
export let userName: string;        // "София"
export let badge: Badge;            // 'gold'
export let eventName: string;       // "XIV ВСЕРОССИЙСКИЙ СЪЕЗД СМУ И СНО"
export let councilLines: string[];  // массив строк длинного названия коорд. совета
export let date: string;            // дата выдачи
export let logoUrls?: string[];     // логотипы/печати (опционально)
```

---

## 3. Инструкция для OpenDesign

### Компонент A: `GtoM_ResultsTable.svelte`

**Назначение**: выводить HTML-таблицу, адаптированную под экран и под печать.

**Layout**:
- Ширина: 100%, максимум `900px`, отступы `padding: 24px`.
- Шапка документа (не таблица):
  - Заголовок: «Результаты исследования» (h1, `font-size: 22px`, centers).
  - Подзаголовок: ««Ментально готов к труду и обороне»» (h2, `font-size: 18px`, centers).
  - Блок пользователя: «**ID {user.id} – {user.name}**» и строка «Нормативы для {user.groupLabel}».
- Таблица (`<table class="gto-table">`):
  - Шапка с двумя уровнями:
    - 1-й уровень: п/п | Наименование норматива | Результаты | Рейтинг приложения | Нормативы для {groupLabel} (объединяет три колонки).
    - 2-й уровень: ЗОЛОТО | СЕРЕБРО | БРОНЗА.
  - Стиль шапки: фон `#f5f5f5`, текст `#111`, `font-weight: 600`, `font-size: 13px`.
  - Ячейки: `padding: 10px 12px`, границы `1px solid #ddd`.
  - Колонка «Рейтинг приложения»:
    - текст: «**Вы лучше, чем {ratingPercent}% пользователей**».
    - если `ratingPercent === null` → «**Нет данных для рейтинга**».
  - Если `subRows` есть (моторная реакция):
    - родительская строка содержит только `title` и `subtitle`.
    - далее идут подстроки с пустой/нулевой нумерацией, где колонка норматива заполнена, а в `title` подставляется `subRow.label` или остаётся пустой отступ.

**Типографика**:
- Основной текст: системный sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`).
- Размер текста в ячейках: `14px`, межстрочное `1.4`.
- Значения в ячейках нормативов (Золото/Серебро/Бронза): полужирное начертание.

**Цвета**:
- Золото: `#C9971C` (текст/рамка) или фон `#FFF8E1`.
- Серебро: `#8E8E8E` (текст/рамка) или фон `#F5F5F5`.
- Бронза: `#A67B5B` (текст/рамка) или фон `#F3E5DC`.

**Адаптив**:
- На экранах `< 768px` переключить таблицу в карточный вид (каждая строка — карточка с grid 2 колонки: показатель / значение).

**Печать**:
- Добавить `@media print`:
  - `body { background: white; }`
  - `.gto-table { font-size: 12px; }`
  - Убрать тени, скругления, перекрасить цвета в чёрный/тёмно-серый (кроме акцента знака).
  - `page-break-inside: avoid` для строк таблицы.

**Кодовый каркас**, который должен сгенерировать OpenDesign:
```svelte
<script lang="ts">
  import type { UserProfile, ResultRow } from './types';
  export let user: UserProfile;
  export let results: ResultRow[];
</script>

<div class="gto-results-container">
  <header class="doc-header">…</header>
  <table class="gto-table">…</table>
</div>

<style>
  :global(body) { … }
  .gto-results-container { … }
  .gto-table { … }
  @media print { … }
</style>
```

---

### Компонент B: `GtoM_Certificate.svelte`

**Назначение**: формировать HTML-сертификат для печати/сохранения в PDF. Рекомендуемый формат: `A4` портретная (`210mm x 297mm`).

**Layout**:
- Обёртка `.certificate-sheet` (`width: 210mm; min-height: 297mm; margin: 0 auto; padding: 40mm 20mm; box-sizing: border-box; position: relative;`).
- Фон: светлый градиент или холстовая текстура (`background: linear-gradient(135deg, #fff 0%, #fdfbf7 100%);`).
- Вертикальная структура:
  1. **Верхний колонтитул**: eventName (капселок, межбуквенный интервал `2px`, цвет `#444`).
  2. **Центральный блок**:
     - «Сертификат №{certNumber} {userName}» — large serif (`font-family: "Times New Roman", Georgia, serif; font-size: 32px; font-weight: 700; text-align: center;`).
     - «Награждается» — курсив, `font-size: 18px`.
     - Знак вставить как инлайн-бейдж: `{#if badge === 'gold'}<span class="badge gold">ЗОЛОТЫМ</span>{/if}` и т.д. — капс, крупный шрифт, цветной.
     - Полное название: «…знаком отличия тестирования «Ментально готов к труду и обороне» (ГТО-М)» — centered, `max-width: 80%`.
  3. **Нижний блок**:
     - «КОРСОВЕТ» заголовком.
     - Под ним `{#each councilLines as line}` — каждая строка маленьким капсом (`font-size: 10px; letter-spacing: 1px; text-align: center; color: #555`).
  4. **Декоративные элементы**:
     - Тонкая рамка `border: 2px solid #C9971C` (для золотого диплома; для серебра — `#8E8E8E`, для бронзы — `#A67B5B`) с внутренним отступом.
     - Если `logoUrls` переданы — позиционировать абсолютно внизу (`position: absolute; bottom: 30mm; left/right: 20mm`) как печати.

**Условные стили знака**:
```css
.badge.gold { color: #B8860B; }
.badge.silver { color: #707070; }
.badge.bronze { color: #8B5A2B; }
```

**Каркас**:
```svelte
<script lang="ts">
  export let certNumber: string;
  export let userName: string;
  export let badge: 'gold' | 'silver' | 'bronze';
  export let eventName: string;
  export let councilLines: string[];
  export let date: string;
  export let logoUrls: string[] = [];
</script>

<article class="certificate-sheet" data-badge={badge}>
  <div class="frame">
    <header>{eventName}</header>
    <main>
      <h1>Сертификат №{certNumber} {userName}</h1>
      <p>Награждается <strong class="badge {badge}">{badgeLabel(badge)}</strong> знаком отличия…</p>
    </main>
    <footer>
      <div class="council">
        <div class="council-title">КОРСОВЕТ</div>
        {#each councilLines as line}<div class="council-line">{line}</div>{/each}
      </div>
      <div class="date">{date}</div>
      {#if logoUrls.length}<div class="logos">…</div>{/if}
    </footer>
  </div>
</article>
```

**Печать**:
- `@media print { @page { size: A4 portrait; margin: 0; } .certificate-sheet { box-shadow: none; } }`

---

## 4. Пример данных (на основе Софии)

Передай OpenDesign этот JSON как reference-фикстуру для превью:

```json
{
  "user": {
    "id": "0095",
    "name": "София",
    "groupLabel": "женщины 35–39 лет",
    "badge": "gold"
  },
  "results": [
    { "id":"decisions","order":1,"title":"Скорость принятия решений","subtitle":"(средняя скорость в с., % правильных ответов)","userResult":"1,41 с, 100%","ratingPercent":40,"norms":{"gold":"1,43 с 100%","silver":"1,65 с 100%","bronze":"1,9 с 80%"} },
    { "id":"motor","order":1,"title":"Скорость моторной реакции","subtitle":"(средняя скорость правая/левая в мс.)","userResult":"—","ratingPercent":null,"norms":{"gold":"","silver":"","bronze":""}, "subRows": [
      { "label":"Правая","userResult":"—","norms":{"gold":"581,61","silver":"643,66","bronze":"785,62"} },
      { "label":"Левая","userResult":"—","norms":{"gold":"526,92","silver":"653,5","bronze":"780,41"} }
    ]},
    { "id":"shortMemory","order":2,"title":"Кратковременная память","subtitle":"(средняя скорость в с., % правильных ответов)","userResult":"1,12 с, 100%","ratingPercent":45,"norms":{"gold":"0,86 с 100%","silver":"0,97 с 100%","bronze":"1,11 с 90%"} },
    { "id":"delayedMemory","order":2,"title":"Отложенная память","subtitle":"(количество слов в верной последовательности)","userResult":"5 слов","ratingPercent":73,"norms":{"gold":"5","silver":"4","bronze":"3"} },
    { "id":"balance","order":3,"title":"Тест на равновесие","subtitle":"(статическая поза на одной ноге, временной диапазон)","userResult":"60+ с","ratingPercent":80,"norms":{"gold":"60+","silver":"45+","bronze":"30+"} },
    { "id":"labyrinth","order":4,"title":"Тест «Лабиринт»","subtitle":"(запоминание расположения предметов, баллы)","userResult":"3","ratingPercent":72,"norms":{"gold":"3","silver":"2","bronze":"1"} },
    { "id":"munsterberg","order":5,"title":"Тест Мюнстерберга","subtitle":"(процент найденных слов)","userResult":"100%","ratingPercent":51,"norms":{"gold":"100%","silver":"80%","bronze":"50%"} },
    { "id":"cognitive","order":6,"title":"Когнитивный конфликт","subtitle":"(средняя скорость в с., % правильных ответов)","userResult":"1,3 с, 100%","ratingPercent":42,"norms":{"gold":"1,12 с 100%","silver":"1,26 с 100%","bronze":"1,67 с 70%"} },
    { "id":"figures","order":7,"title":"Найти соответствие фигурам","subtitle":"(средняя скорость в с., % правильных ответов)","userResult":"15,19 с, 60%","ratingPercent":58,"norms":{"gold":"8 с 80%","silver":"17 с 62,5%","bronze":"23 с 30%"} },
    { "id":"logic","order":8,"title":"Логика","subtitle":"(баллы)","userResult":"0","ratingPercent":25,"norms":{"gold":"1","silver":"—","bronze":"0"} }
  ],
  "certificate": {
    "certNumber": "0095",
    "userName": "София",
    "badge": "gold",
    "eventName": "XIV ВСЕРОССИЙСКИЙ СЪЕЗД СМУ И СНО",
    "councilLines": [
      "КООРДИНАЦИОННЫЙ СОВЕТ ПО ДЕЛАМ МОЛОДЁЖИ",
      "В НАУЧНОЙ И ОБРАЗОВАТЕЛЬНОЙ СФЕРАХ",
      "ПРИ СОВЕТЕ ПРИ ПРЕЗИДЕНТЕ РОССИЙСКОЙ ФЕДЕРАЦИИ",
      "ПО НАУКЕ И ОБРАЗОВАНИЮ",
      "МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"
    ],
    "date": "2025-05-20",
    "logoUrls": []
  }
}
```

---

## 5. Что уточнить перед финальной генерацией

Есть несколько моментов, которые сильно повлияют на макет:

1. **Формат выхода** — это веб-страница в приложении, или вёрстка только для печати/PDF (через Puppeteer/Playwright)?
2. **Сертификат** — нужна ли возможность выбора фона (текстура/рамка) или статичный шаблон? Будут ли печати и логотипы подгружаться динамически?
3. **Моторная реакция** — в таблице две строки нормативов (правая/левая). Всегда ли такая структура, или бывают другие многострочные нормативы?

Если дашь ответ, дополню инструкцию точными ограничениями по размерам и адаптации.
