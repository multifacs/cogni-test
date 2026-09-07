#!/usr/bin/env bash
# cert-help.sh — шпаргалка: что делать, если dev-сервер запускается из WSL,
# а браузер — на Windows, и Chrome ругается на сертификат localhost.
#
# Симптом: https://localhost:5173 открывается только через "Proceed anyway",
# но POST-запросы (логин) падают с net::ERR_CERT_AUTHORITY_INVALID,
# а HMR-вебсокет (wss://localhost:5173) не подключается.
#
# Причина: vite-plugin-mkcert (см. vite.config.ts) подписывает сертификат
# dev-сервера локальным CA и устанавливает его в trust store WSL.
# Windows Chrome про этот CA ничего не знает — отсюда ошибка.
#
# Решение: ОДИН раз импортировать rootCA.pem в Windows trusted root store.

set -euo pipefail

CAROOT="$HOME/.vite-plugin-mkcert"
CERT="$CAROOT/rootCA.pem"

echo "=== cert-help: доверие к mkcert CA при запуске сайта из WSL ==="
echo ""

if [ ! -f "$CERT" ]; then
	echo "(!) Файл не найден: $CERT"
	echo "    Запусти 'npm run dev' хотя бы один раз — плагин сгенерирует сертификаты,"
	echo "    затем запусти этот скрипт снова."
	exit 1
fi

echo "1) CA-сертификат dev-сервера:"
echo "   $CERT"
if command -v wslpath >/dev/null 2>&1; then
	echo "   Тот же файл из Windows:"
	echo "   $(wslpath -w "$CERT")"
fi
echo ""
echo "2) Импортируй CA в Windows (от имени администратора):"
echo "   Вариант A — терминал Windows (Admin) или PowerShell (Admin):"
echo "     certutil -addstore -f ROOT <путь-к-rootCA.pem>"
echo "   Вариант B — прямо из WSL (появится окно UAC):"
echo '     powershell.exe -Command "Start-Process certutil -ArgumentList '"'"'-addstore'"'"','"'"'-f'"'"','"'"'ROOT'"'"','"'"'<win-путь-к-rootCA.pem>'"'"' -Verb RunAs"'
echo "   Вариант C — вручную: Win+R -> certmgr.msc ->"
echo "     Trusted Root Certification Authorities -> Certificates ->"
echo "     All Tasks -> Import -> выбери rootCA.pem"
echo ""
echo "3) Полностью перезапусти Chrome (chrome://restart или закрыть ВСЕ окна),"
echo "   иначе новый сертификат не подхватится."
echo ""
echo "4) Проверка: https://localhost:5173 открывается БЕЗ предупреждения,"
echo "   в консоли браузера видно [vite] connected, логин отвечает."
echo ""
echo "Если сертификаты устарели/пересоздались: удали $CAROOT,"
echo "перезапусти dev-сервер и повтори импорт нового rootCA.pem."
