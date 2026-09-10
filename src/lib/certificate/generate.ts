import type { CertificateData } from './certificate-data';

/**
 * Генерация PDF-сертификата целиком в браузере.
 *
 * Кириллица не поддерживается встроенными шрифтами jsPDF, поэтому бланк
 * рисуется как SVG → растеризуется в canvas → вставляется в PDF картинкой.
 *
 * Модульный верхний уровень SSR-безопасен: document/Image/canvas живут
 * только внутри downloadCertificatePdf.
 */

/** Пикселей на миллиметр при 96 dpi — единая математика SVG и растеризации. */
const PX_PER_MM = 96 / 25.4;
/** A4 landscape в пикселях: ≈1122.52 × 793.70. */
const PAGE_WIDTH = 297 * PX_PER_MM;
const PAGE_HEIGHT = 210 * PX_PER_MM;

/** Растеризация в 2.5× от 96 dpi — «печатное» качество без гигантского canvas. */
const RASTER_SCALE = 2.5;

const PAPER = '#fdfaf1';
const INK = '#2c2416';
const GOLD = '#7a6a3a';
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Число с двумя знаками — компактные SVG-атрибуты. */
function px(value: number): string {
	return value.toFixed(2);
}

/** Ромб-орнамент в углу внутренней рамки. */
function cornerOrnament(x: number, y: number): string {
	return `<rect x="${px(x - 6)}" y="${px(y - 6)}" width="12" height="12" transform="rotate(45 ${px(x)} ${px(y)})" fill="${PAPER}" stroke="${GOLD}" stroke-width="1.2"/>`;
}

/**
 * Чистый сборщик SVG-бланка («бумажный» классический стиль).
 * Не касается DOM — тестируется в серверных тестах.
 */
export function buildCertificateSvg(data: CertificateData): string {
	const w = PAGE_WIDTH;
	const h = PAGE_HEIGHT;
	const cx = w / 2;

	// Длинные имена не вылезают за рамку
	const nameFontSize = data.name.length > 28 ? 32 : 44;

	const summaryRows = data.testSummary
		.map((entry, index) => {
			const y = 492 + index * 27;
			return (
				`<text x="${px(cx - 260)}" y="${px(y)}" font-family="${FONT_SERIF}" font-size="15" fill="${INK}" fill-opacity="0.78">${escapeXml(entry.label)}</text>` +
				`<line x1="${px(cx - 115)}" y1="${px(y - 4)}" x2="${px(cx + 70)}" y2="${px(y - 4)}" stroke="${GOLD}" stroke-opacity="0.45" stroke-dasharray="1 4" stroke-linecap="round"/>` +
				`<text x="${px(cx + 260)}" y="${px(y)}" text-anchor="end" font-family="${FONT_SERIF}" font-size="15" font-weight="600" fill="${INK}">${escapeXml(entry.value)}</text>`
			);
		})
		.join('');

	const summaryBlock =
		data.testSummary.length === 0
			? ''
			: `<text x="${px(cx)}" y="460" text-anchor="middle" font-family="${FONT_SERIF}" font-size="13" letter-spacing="4" fill="${GOLD}">РЕЗУЛЬТАТЫ ТЕСТОВ</text>${summaryRows}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${px(w)}" height="${px(h)}" viewBox="0 0 ${px(w)} ${px(h)}">
<rect x="0" y="0" width="${px(w)}" height="${px(h)}" fill="${PAPER}"/>
<rect x="16" y="16" width="${px(w - 32)}" height="${px(h - 32)}" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
<rect x="30" y="30" width="${px(w - 60)}" height="${px(h - 60)}" fill="none" stroke="${GOLD}" stroke-width="4"/>
${cornerOrnament(30, 30)}${cornerOrnament(w - 30, 30)}${cornerOrnament(30, h - 30)}${cornerOrnament(w - 30, h - 30)}
<line x1="${px(cx - 270)}" y1="118" x2="${px(cx - 130)}" y2="118" stroke="${GOLD}" stroke-width="1"/>
<line x1="${px(cx + 130)}" y1="118" x2="${px(cx + 270)}" y2="118" stroke="${GOLD}" stroke-width="1"/>
<text x="${px(cx)}" y="130" text-anchor="middle" font-family="${FONT_SERIF}" font-size="42" font-weight="700" letter-spacing="12" fill="${INK}">${escapeXml(data.headline)}</text>
<text x="${px(cx)}" y="172" text-anchor="middle" font-family="${FONT_SERIF}" font-size="21" font-style="italic" fill="${INK}" fill-opacity="0.85">${escapeXml(data.awardedTo)}</text>
<text x="${px(cx)}" y="238" text-anchor="middle" font-family="${FONT_SERIF}" font-size="${nameFontSize}" font-weight="700" fill="${INK}">${escapeXml(data.name)}</text>
<line x1="${px(cx - 150)}" y1="266" x2="${px(cx - 22)}" y2="266" stroke="${GOLD}" stroke-width="1"/>
<line x1="${px(cx + 22)}" y1="266" x2="${px(cx + 150)}" y2="266" stroke="${GOLD}" stroke-width="1"/>
<rect x="${px(cx - 7)}" y="259" width="14" height="14" transform="rotate(45 ${px(cx)} 266)" fill="${GOLD}"/>
<text x="${px(cx)}" y="306" text-anchor="middle" font-family="${FONT_SERIF}" font-size="18" font-style="italic" fill="${INK}" fill-opacity="0.9">за прохождение серии когнитивных тестов</text>
<text x="${px(cx)}" y="342" text-anchor="middle" font-family="${FONT_SERIF}" font-size="23" font-weight="700" fill="${INK}">${escapeXml(data.sessionName)}</text>
<text x="${px(cx)}" y="372" text-anchor="middle" font-family="${FONT_SERIF}" font-size="16" fill="${INK}" fill-opacity="0.75">${escapeXml(data.dateLabel)}</text>
<text x="${px(cx)}" y="414" text-anchor="middle" font-family="${FONT_SERIF}" font-size="18" fill="${INK}">Последовательность слов — <tspan font-weight="700">${escapeXml(data.wordsLabel)}</tspan></text>
${summaryBlock}
<line x1="180" y1="706" x2="400" y2="706" stroke="${INK}" stroke-width="1"/>
<text x="290" y="728" text-anchor="middle" font-family="${FONT_SERIF}" font-size="13" font-style="italic" fill="${INK}" fill-opacity="0.6">подпись</text>
<circle cx="${px(w - 120)}" cy="705" r="50" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="7 5"/>
<circle cx="${px(w - 120)}" cy="705" r="42" fill="none" stroke="${GOLD}" stroke-width="0.75"/>
<text x="${px(w - 120)}" y="710" text-anchor="middle" font-family="${FONT_SERIF}" font-size="13" letter-spacing="2" fill="${GOLD}">печать</text>
</svg>`;
}

/** Загружает SVG в Image без обращения к внешним ресурсам (canvas не «пачкается»). */
function loadSvgImage(svg: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Не удалось растеризовать SVG сертификата'));
		image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	});
}

/** Растеризует SVG-бланк в PNG data URL формата A4 landscape. */
async function rasterizeCertificate(svg: string): Promise<string> {
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(297 * PX_PER_MM * RASTER_SCALE);
	canvas.height = Math.round(210 * PX_PER_MM * RASTER_SCALE);

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas 2D context недоступен');
	}

	const image = await loadSvgImage(svg);
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL('image/png');
}

/** Собирает сертификат и скачивает его как gto-certificate.pdf. Только для браузера. */
export async function downloadCertificatePdf(data: CertificateData): Promise<void> {
	const svg = buildCertificateSvg(data);
	const png = await rasterizeCertificate(svg);

	const { jsPDF } = await import('jspdf');
	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	doc.addImage(png, 'PNG', 0, 0, 297, 210);
	doc.save('gto-certificate.pdf');
}
