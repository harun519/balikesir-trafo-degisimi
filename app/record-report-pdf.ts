// Browser-only, offline PDF download. No remote services or data writes.
type ReportColumn = { label: string; weight: number };
function jpegBytes(canvas: HTMLCanvasElement): Uint8Array<ArrayBuffer> {
  const raw = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function imagePdf(images: Uint8Array<ArrayBuffer>[], width: number, height: number): Blob {
  const enc = new TextEncoder();
  const bytes = (s: string) => enc.encode(s);
  const join = (parts: Uint8Array<ArrayBuffer>[]) => {
    const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
    return result;
  };
  const objects: Uint8Array<ArrayBuffer>[] = [];
  objects[1] = bytes('<< /Type /Catalog /Pages 2 0 R >>');
  objects[2] = bytes(`<< /Type /Pages /Kids [${images.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${images.length} >>`);
  images.forEach((jpeg, i) => {
    const page = 3 + i * 3, image = page + 1, stream = page + 2;
    const command = 'q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n';
    objects[page] = bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${stream} 0 R >>`);
    objects[image] = join([bytes(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, bytes('\nendstream')]);
    objects[stream] = bytes(`<< /Length ${bytes(command).length} >>\nstream\n${command}endstream`);
  });
  const parts = [bytes('%PDF-1.4\n%TRAFO\n')], offsets = [0];
  let length = parts[0].length;
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = length;
    const entry = [bytes(`${i} 0 obj\n`), objects[i], bytes('\nendobj\n')];
    parts.push(...entry); length += entry.reduce((n, p) => n + p.length, 0);
  }
  const xref = length;
  let table = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  parts.push(bytes(`${table}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob([join(parts)], { type: 'application/pdf' });
}
function wrapText(ctx: CanvasRenderingContext2D, value: unknown, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of String(value ?? '').split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && ctx.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
      if (ctx.measureText(word).width <= width) { line = line ? line + ' ' + word : word; continue; }
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
export function saveRecordReportPdf(columns: ReportColumn[], rows: unknown[][]): void {
  if (!rows.length) throw new Error('Kaydedilecek kayıt bulunmuyor.');
  const W = 2382, H = 1684, M = 68, bottom = H - 90, lineHeight = 28;
  const totalWeight = columns.reduce((n, c) => n + c.weight, 0);
  const widths = columns.map(c => (W - 2 * M) * c.weight / totalWeight);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PDF çizim alanı oluşturulamadı.');
  const images: Uint8Array<ArrayBuffer>[] = [];
  let y = 0, page = 0;
  const stamp = new Date().toLocaleString('tr-TR');
  function newPage() {
    page++; ctx!.fillStyle = '#ffffff'; ctx!.fillRect(0, 0, W, H);
    ctx!.fillStyle = '#17365d'; ctx!.fillRect(0, 0, W, 135);
    ctx!.fillStyle = '#ffffff'; ctx!.font = 'bold 42px Arial';
    ctx!.fillText('BALIKESİR TRAFO DEĞİŞİM RAPORU', M, 64);
    ctx!.font = '25px Arial'; ctx!.fillText(`Toplam kayıt: ${rows.length}  ·  ${stamp}`, M, 106);
    y = 174; let x = M;
    ctx!.font = 'bold 22px Arial';
    const headings = columns.map((c, i) => wrapText(ctx!, c.label, widths[i] - 20));
    const height = Math.max(...headings.map(h => h.length)) * lineHeight + 24;
    columns.forEach((_, i) => {
      ctx!.fillStyle = '#eaf0f7'; ctx!.fillRect(x, y, widths[i], height);
      ctx!.strokeStyle = '#ccd5df'; ctx!.strokeRect(x, y, widths[i], height);
      ctx!.fillStyle = '#17365d'; headings[i].forEach((line, j) => ctx!.fillText(line, x + 10, y + 28 + j * lineHeight)); x += widths[i];
    });
    y += height;
  }
  function finishPage() {
    ctx!.fillStyle = '#64748b'; ctx!.font = '22px Arial';
    ctx!.fillText(`Sayfa ${page}`, M, H - 44); images.push(jpegBytes(canvas));
  }
  newPage();
  rows.forEach((row, rowIndex) => {
    ctx.font = '22px Arial';
    const cells = columns.map((_, i) => wrapText(ctx, row[i], widths[i] - 20));
    const lineCount = Math.max(...cells.map(c => c.length));
    if (y + lineCount * lineHeight + 24 > bottom && lineCount * lineHeight + 24 < bottom - 300) { finishPage(); newPage(); }
    let start = 0;
    while (start < lineCount) {
      let available = Math.floor((bottom - y - 24) / lineHeight);
      if (available < 1) { finishPage(); newPage(); available = Math.floor((bottom - y - 24) / lineHeight); }
      const count = Math.min(available, lineCount - start), height = count * lineHeight + 24;
      let x = M; ctx.font = '22px Arial';
      cells.forEach((lines, i) => {
        ctx.fillStyle = rowIndex % 2 ? '#f5f8fc' : '#ffffff'; ctx.fillRect(x, y, widths[i], height);
        ctx.strokeStyle = '#d5dde7'; ctx.strokeRect(x, y, widths[i], height);
        ctx.fillStyle = '#17263c'; lines.slice(start, start + count).forEach((line, j) => ctx.fillText(line, x + 10, y + 28 + j * lineHeight));
        x += widths[i];
      });
      y += height; start += count;
      if (start < lineCount) { finishPage(); newPage(); }
    }
  });
  finishPage();
  const blob = imagePdf(images, W, H), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `Balikesir_Trafo_Degisim_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
