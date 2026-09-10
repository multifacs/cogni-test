// Общие классы полей ввода логина — единственный источник правды
// для TextInput и DateInput, чтобы стили не расходились.
export const INPUT_CLASS = `
	max-xs:text-base
	max-xs:p-1
	xs:p-2.5
	block
	w-full
	rounded-lg
	border
	bg-(--input-bg-color)
	p-2
	text-(--main-text-color)
	placeholder-gray-400
	outline-0
	transition
	focus:border-[var(--main-accent-color)]
	focus:ring-[var(--main-accent-color)]
`;
