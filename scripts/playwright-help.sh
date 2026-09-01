#!/usr/bin/env bash
#
# playwright-help.sh — чинит `npx playwright install` и браузерные тесты (npm run test)
# на Ubuntu 26.04 в WSL.
#
# В ЧЁМ ОШИБКА
# ============
# 1) `npx playwright install chromium` падает с:
#        ERROR: Playwright does not support chromium on ubuntu26.04-x64
#    Причина: в package-lock.json зафиксирован playwright@1.60.0, а его реестр
#    сборок браузеров знает только ubuntu20.04/22.04/24.04 — Ubuntu 26.04 там нет.
#    Решение: переменная окружения PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 —
#    playwright скачает сборку для ubuntu24.04 (бинарник совместим с 26.04).
#    ВАЖНО: значение обязательно с суффиксом архитектуры («-x64»),
#    без него подмена молча не срабатывает и ошибка повторяется.
#
# 2) Предыстория: в ~/.cache/ms-playwright лежит chromium-1226 (его поставила более
#    новая версия playwright), а проекту нужен 1223 — отсюда исходное падение
#    npm run test с «Executable doesn't exist ... chromium_headless_shell-1223».
#
# 3) В системе не хватает библиотек chromium: libnspr4.so, libnss3.so (+libnssutil3,
#    libsmime3 из того же пакета), libasound.so.2. Без них браузер стартует и сразу
#    падает: «error while loading shared libraries: libnspr4.so».
#    Ставятся пакетами: libnspr4 libnss3 libasound2t64.
#
# Скрипт идемпотентный: повторный запуск пропускает уже установленное.
# Запускать из корня репозитория cogni-test.

set -euo pipefail

# --- 0. Проверки окружения ---------------------------------------------------

if [ ! -x node_modules/.bin/playwright ]; then
	echo "Ошибка: запусти из корня репозитория cogni-test (нет node_modules/.bin/playwright)" >&2
	exit 1
fi

ARCH_SUFFIX="$(uname -m)"
case "$ARCH_SUFFIX" in
	x86_64) ARCH_SUFFIX="x64" ;;
	aarch64) ARCH_SUFFIX="arm64" ;;
	*) echo "Неизвестная архитектура: $ARCH_SUFFIX" >&2; exit 1 ;;
esac

# Playwright 1.60 не поддерживает Ubuntu >= 25 — подменяем платформу на ubuntu24.04
OVERRIDE=""
if [ -r /etc/os-release ]; then
	. /etc/os-release
	if [ "${ID:-}" = "ubuntu" ] && [ "${VERSION_ID:-}" != "" ]; then
		MAJOR="${VERSION_ID%%.*}"
		if [ "$MAJOR" -ge 25 ] 2>/dev/null; then
			OVERRIDE="ubuntu24.04-${ARCH_SUFFIX}"
		fi
	fi
fi

# --- 1. Системные библиотеки -------------------------------------------------

missing_libs=()
for lib in libnspr4.so libnss3.so libasound.so.2; do
	ldconfig -p | grep -q "$lib" || missing_libs+=("$lib")
done

if [ "${#missing_libs[@]}" -gt 0 ]; then
	echo ">> Не хватает библиотек: ${missing_libs[*]}"
	echo ">> Ставлю пакеты libnspr4 libnss3 libasound2t64 (потребуется sudo)..."
	sudo apt-get update -qq
	sudo apt-get install -y libnspr4 libnss3 libasound2t64
else
	echo ">> Системные библиотеки на месте"
fi

# --- 2. Браузеры -------------------------------------------------------------

# Путь, где chromium-1223 должен лежать по мнению playwright из этого репозитория
CHROME_PATH="$(node -p 'require("playwright-core").chromium.executablePath()' 2>/dev/null || true)"

if [ -n "$CHROME_PATH" ] && [ -x "$CHROME_PATH" ]; then
	echo ">> Браузер уже установлен: $CHROME_PATH"
else
	if [ -n "$OVERRIDE" ]; then
		echo ">> Платформа не поддерживается playwright 1.60 — качаю сборку для $OVERRIDE"
		PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="$OVERRIDE" npx playwright install chromium
	else
		npx playwright install chromium
	fi
fi

# --- 3. Готово ---------------------------------------------------------------

echo
echo "Готово. Проверка: npm run test"
echo "(override нужен был только для установки; для запуска тестов переменная не требуется)"
