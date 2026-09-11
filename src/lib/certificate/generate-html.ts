import type { CertificateData, CertificateOrientation } from './certificate-data';

/**
 * Генерация self-contained HTML-сертификата ГТО-М.
 * Открывается в любом браузере офлайн, печатается в PDF через Ctrl+P.
 *
 * Структура соответствует INSTRUCTION.md:
 *   - eventName в верхнем колонтитуле
 *   - «Сертификат №{n} {name}»
 *   - «Награждается {ЗОЛОТЫМ|СЕРЕБРЯНЫМ|БРОНЗОВЫМ} знаком отличия…(ГТО-М)»
 *   - Нижний блок: КОРСОВЕТ + строки + дата + печать
 */

// ─── Утилиты ──────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function badgeLabel(badge: CertificateData['badge']): string {
	switch (badge) {
		case 'gold':
			return 'ЗОЛОТЫМ';
		case 'silver':
			return 'СЕРЕБРЯНЫМ';
		case 'bronze':
			return 'БРОНЗОВЫМ';
	}
}

function badgeColor(badge: CertificateData['badge']): string {
	switch (badge) {
		case 'gold':
			return '#B8860B';
		case 'silver':
			return '#707070';
		case 'bronze':
			return '#8B5A2B';
	}
}

function frameColor(badge: CertificateData['badge']): string {
	switch (badge) {
		case 'gold':
			return '#C9971C';
		case 'silver':
			return '#8E8E8E';
		case 'bronze':
			return '#A67B5B';
	}
}

function certificateFileName(data: CertificateData, orientation: CertificateOrientation): string {
	const slug = data.name
		.replace(/Ё/g, 'Е')
		.replace(/[^А-ЯA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const suffix = slug ? `-${slug}` : '';
	return `gto-certificate-${orientation}${suffix}.html`;
}

// ─── Pixel-perfect decorative seal (SVG data URI) ─────────────────────
const SEAL_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0M5OTcxQyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQzk5NzFDIiBzdHJva2Utd2lkdGg9IjAuNzUiLz48dGV4dCB4PSI1MCIgeT0iNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjQjg4NjBCIiBsZXR0ZXItc3BhY2luZz0iMSI+0JPQotCeLdCcPC90ZXh0Pjwvc3ZnPg==';

// ─── Body generation ──────────────────────────────────────────────────

function certificateBody(data: CertificateData): string {
	const linesHtml = data.councilLines
		.map((line) => `<div class="council-line">${escapeHtml(line)}</div>`)
		.join('\n');

	return `
	<header class="event-name">${escapeHtml(data.eventName)}</header>

	<main class="cert-main">
		<h1 class="cert-number">
			Сертификат №${escapeHtml(data.certNumber)} ${escapeHtml(data.name)}
		</h1>
		<p class="cert-awarded">Награждается</p>
		<p class="cert-badge">
			<strong class="badge ${data.badge}">${badgeLabel(data.badge)}</strong>
			знаком отличия
		</p>
		<p class="cert-program">
			тестирования «Ментально готов к<br>труду и обороне» (ГТО-М)
		</p>
	</main>

	<footer class="cert-footer">
		<div class="council">
			<div class="council-title">КОРСОВЕТ</div>
			${linesHtml}
		</div>
		<div class="cert-date">${escapeHtml(data.date)}</div>
		<div class="seal" aria-hidden="true">
			<img src="${SEAL_SVG}" width="100" height="100" alt="">
		</div>
	</footer>`;
}

// ─── Full document ────────────────────────────────────────────────────

export function buildCertificateHtml(
	data: CertificateData,
	orientation: CertificateOrientation
): string {
	const isPortrait = orientation === 'portrait';
	const badgeC = badgeColor(data.badge);
	const frameC = frameColor(data.badge);

	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сертификат — ${escapeHtml(data.name)}</title>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }

	html, body {
		background: linear-gradient(135deg, #009688 0%, #00796b 100%);
		min-height: 100vh;
	}

	.sheet {
		width: ${isPortrait ? '210mm' : '297mm'};
		min-height: ${isPortrait ? '297mm' : '210mm'};
		margin: 0 auto;
		padding: ${isPortrait ? '16mm' : '12mm'};
		background: linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%);
		position: relative;
		font-family: "Times New Roman", Georgia, serif;
		color: #111;
		display: flex;
		box-shadow: 0 4px 24px rgba(0,0,0,.25);
	}

	.frame {
		flex: 1;
		border: 2px solid ${frameC};
		outline: 1px solid ${frameC};
		outline-offset: 3mm;
		padding: ${isPortrait ? '18mm 16mm' : '14mm 20mm'};
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	/* Corner diamonds */
	.corner-b { position: absolute; inset: 0; pointer-events: none; }
	.frame::before, .frame::after, .corner-b::before, .corner-b::after {
		content: '';
		position: absolute;
		width: 10px;
		height: 10px;
		background: #fff;
		border: 1.2px solid ${frameC};
		transform: rotate(45deg);
	}
	.frame::before  { top: -6px; left: -6px; }
	.frame::after   { top: -6px; right: -6px; }
	.corner-b::before { bottom: -6px; left: -6px; }
	.corner-b::after  { bottom: -6px; right: -6px; }

	.event-name {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		font-size: ${isPortrait ? '11px' : '13px'};
		letter-spacing: 2px;
		text-transform: uppercase;
		color: #555;
		margin-bottom: 8mm;
	}

	.cert-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 8mm 0;
	}

	.cert-number {
		font-size: ${data.name.length > 28 ? (isPortrait ? 22 : 26) : (isPortrait ? 26 : 30)}px;
		font-weight: 700;
		line-height: 1.3;
		margin-bottom: 6mm;
	}

	.cert-awarded {
		font-size: ${isPortrait ? '16px' : '18px'};
		font-style: italic;
		color: #444;
		margin-bottom: 4mm;
	}

	.cert-badge {
		font-size: ${isPortrait ? '18px' : '22px'};
		margin-bottom: 4mm;
	}

	.badge {
		font-weight: 700;
		font-size: ${isPortrait ? '22px' : '26px'};
		color: ${badgeC};
	}

	.cert-program {
		font-size: ${isPortrait ? '15px' : '17px'};
		color: #333;
		line-height: 1.5;
		max-width: 85%;
	}

	.cert-footer {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4mm;
		padding-top: 6mm;
	}

	.council { text-align: center; }
	.council-title {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 3px;
		color: #555;
		text-transform: uppercase;
		margin-bottom: 2mm;
	}
	.council-line {
		font-size: 9px;
		letter-spacing: 1px;
		color: #666;
		text-transform: uppercase;
		line-height: 1.6;
	}

	.cert-date {
		font-size: 13px;
		color: #555;
		margin-top: 2mm;
	}

	.seal img { display: block; }

	@media print {
		@page { size: ${isPortrait ? 'A4 portrait' : 'A4 landscape'}; margin: 0; }
		html, body { background: #fff; }
		.sheet {
			margin: 0;
			width: auto;
			min-height: auto;
			box-shadow: none;
			padding: ${isPortrait ? '16mm' : '12mm'};
		}
	}

	/* Mobile: fit to screen without horizontal scroll */
	@media screen and (max-width: 720px) {
		body { background: #fff; }
		.sheet {
			width: 100%;
			min-height: auto;
			padding: 4mm;
		}
		.frame { outline-offset: 2mm; padding: 12mm 8mm; }
		.cert-number { font-size: 22px; }
		.badge { font-size: 20px; }
		.cert-badge { font-size: 16px; }
		.cert-program { font-size: 14px; }
		.seal img { width: 72px; height: 72px; }
	}
</style>
</head>
<body>
	<div class="sheet ${orientation}">
		<div class="frame">
			<span class="corner-b" aria-hidden="true"></span>
			${certificateBody(data)}
		</div>
	</div>
</body>
</html>`;
}

/**
 * Собирает HTML-сертификат и инициирует скачивание. Только браузер.
 */
export function downloadCertificateHtml(
	data: CertificateData,
	orientation: CertificateOrientation
): void {
	const html = buildCertificateHtml(data, orientation);
	const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = certificateFileName(data, orientation);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
