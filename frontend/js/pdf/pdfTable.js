/**
 * Generador mínimo de PDF con tablas, sin dependencias externas (el sistema
 * funciona sin internet). Usa las fuentes estándar Helvetica con codificación
 * WinAnsi, que cubre los acentos y la ñ del español.
 */

const PAGE_SIZES = { portrait: [595.28, 841.89], landscape: [841.89, 595.28] };
const MARGIN = 40;

// Anchos de Helvetica (unidades de 1/1000) para los caracteres 32–126.
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const WIN_ANSI_EXTRA = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };

function charWidth(ch, bold) {
  const base = ch.normalize('NFD')[0];
  const code = base.charCodeAt(0);
  const w = code >= 32 && code <= 126 ? WIDTHS[code - 32] : 556;
  return bold ? w * 1.06 : w;
}

export function textWidth(text, size, bold = false) {
  let total = 0;
  for (const ch of text) total += charWidth(ch, bold);
  return (total * size) / 1000;
}

function fit(text, width, size, bold) {
  const value = String(text ?? '');
  if (textWidth(value, size, bold) <= width) return value;
  let result = value;
  while (result.length > 1 && textWidth(`${result}…`, size, bold) > width) result = result.slice(0, -1);
  return `${result.trimEnd()}…`;
}

/** Convierte texto a una cadena literal PDF en WinAnsi (un carácter = un byte). */
function pdfString(text) {
  let out = '';
  for (const ch of String(text)) {
    let code = ch.charCodeAt(0);
    if (WIN_ANSI_EXTRA[ch]) code = WIN_ANSI_EXTRA[ch];
    else if (code > 255 || (code >= 0x80 && code < 0xa0)) code = 63; // '?'
    const c = String.fromCharCode(code);
    out += c === '(' || c === ')' || c === '\\' ? `\\${c}` : c;
  }
  return `(${out})`;
}

const rgb = (hex) =>
  [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string[]} [options.subtitle] líneas bajo el título
 * @param {{ label: string, width: number, align?: 'left'|'right' }[]} options.columns ancho relativo
 * @param {string[][]} options.rows
 * @param {'portrait'|'landscape'} [options.orientation]
 * @param {string} [options.footer] texto al pie de cada página
 * @param {string} [options.emptyText]
 * @returns {Blob}
 */
export function createTablePdf({ title, subtitle = [], columns, rows, orientation = 'portrait', footer = '', emptyText = 'Sin registros.' }) {
  const [pageW, pageH] = PAGE_SIZES[orientation];
  const usable = pageW - MARGIN * 2;
  const totalWeight = columns.reduce((sum, c) => sum + c.width, 0);
  const widths = columns.map((c) => (c.width / totalWeight) * usable);
  const FONT = 9;
  const ROW_H = 18;
  const HEAD_H = 22;
  const bottom = MARGIN + 28;

  const pages = [];
  let ops;
  let y;

  const text = (value, x, yy, size, { bold = false, color = '#1f1d1a' } = {}) =>
    ops.push(`BT ${rgb(color)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td ${pdfString(value)} Tj ET`);
  const rect = (x, yy, w, hh, color) => ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${hh.toFixed(2)} re f`);
  const line = (x1, y1, x2, y2, color) => ops.push(`${rgb(color)} RG 0.6 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);

  function cellX(index, value, size, bold) {
    const left = MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0);
    if (columns[index].align === 'right') return left + widths[index] - 6 - textWidth(value, size, bold);
    return left + 6;
  }

  function tableHeader() {
    rect(MARGIN, y - HEAD_H, usable, HEAD_H, '#e6ebf2');
    columns.forEach((col, i) => {
      const label = fit(col.label, widths[i] - 12, FONT, true);
      text(label, cellX(i, label, FONT, true), y - HEAD_H + 7.5, FONT, { bold: true, color: '#22375a' });
    });
    y -= HEAD_H;
  }

  function newPage(first) {
    ops = [];
    pages.push(ops);
    y = pageH - MARGIN;
    if (first) {
      text(title, MARGIN, y - 16, 16, { bold: true });
      y -= 26;
      subtitle.forEach((lineText) => {
        text(fit(lineText, usable, 9.5), MARGIN, y - 10, 9.5, { color: '#5c564d' });
        y -= 14;
      });
      y -= 10;
    } else {
      text(fit(`${title} (continuación)`, usable, 10, true), MARGIN, y - 10, 10, { bold: true, color: '#5c564d' });
      y -= 22;
    }
    tableHeader();
  }

  newPage(true);

  if (!rows.length) {
    text(emptyText, MARGIN + 6, y - 20, 10, { color: '#5c564d' });
  }

  rows.forEach((row, index) => {
    if (y - ROW_H < bottom) newPage(false);
    if (index % 2 === 1) rect(MARGIN, y - ROW_H, usable, ROW_H, '#faf8f4');
    row.forEach((value, i) => {
      const cell = fit(value, widths[i] - 12, FONT, false);
      text(cell, cellX(i, cell, FONT, false), y - ROW_H + 6, FONT);
    });
    line(MARGIN, y - ROW_H, MARGIN + usable, y - ROW_H, '#e1ddd4');
    y -= ROW_H;
  });

  if (rows.length) {
    if (y - 24 < bottom) newPage(false);
    text(`Total de registros: ${rows.length}`, MARGIN, y - 18, 9, { bold: true, color: '#5c564d' });
  }

  // Pie de página con numeración.
  pages.forEach((pageOps, i) => {
    ops = pageOps;
    line(MARGIN, MARGIN + 14, pageW - MARGIN, MARGIN + 14, '#e1ddd4');
    if (footer) text(fit(footer, usable - 90, 8), MARGIN, MARGIN, 8, { color: '#857e73' });
    const label = `Página ${i + 1} de ${pages.length}`;
    text(label, pageW - MARGIN - textWidth(label, 8), MARGIN, 8, { color: '#857e73' });
  });

  return serialize(pages, pageW, pageH, title);
}

function serialize(pages, pageW, pageH, title) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalog = add(null);
  const pagesRoot = add(null);
  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds = pages.map((pageOps) => {
    const stream = pageOps.join('\n');
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return add(
      `<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`,
    );
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`;
  objects[pagesRoot - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const info = add(`<< /Title ${pdfString(title)} /Producer ${pdfString('Sistema de Préstamo de Equipo de Cómputo')} >>`);

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

/** Descarga un Blob como archivo. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
