// Satu kali pakai: uji visual watermark pada foto interior sungguhan dari
// .backups/originals — render 3 varian (default, halus, kecil+halus) lalu buat
// halaman HTML perbandingan dengan data URI (before/after + close-up zoom×2).
import fs from "fs";
import sharp from "sharp";
import { watermarkPhoto, WATERMARK_TEXT } from "../src/lib/image-watermark";

const ORIG = ".backups/originals/properties/e2e6d462-6990-460f-a197-85d76da8f6f8/apt_hexa_room-1790041049764.jpeg";
const OUT = "mockups/watermark-visual-test.html";
const TEKS = WATERMARK_TEXT;

async function main(): Promise<void> {
  const orig = fs.readFileSync(ORIG);

  const variants: Array<{ nama: string; opts: Parameters<typeof watermarkPhoto>[1]; hasil: Buffer; closeUp: Buffer }> = [];
  const defs = [
    { nama: "A · Default (scale 0.026, opacity 0.88)", opts: { style: "corner" as const } },
    { nama: "B · DEFAULT BARU (scale 0.026, opacity 0.72)", opts: { style: "corner" as const } },
    { nama: "C · Kecil & Halus (scale 0.020, opacity 0.72)", opts: { style: "corner" as const, opacity: 0.72, scale: 0.02 } },
  ];

  for (const def of defs) {
    const { data } = await watermarkPhoto(orig, def.opts);
    const meta = await sharp(data).metadata();
    // close-up kanan-bawah, upscale ×2 biar teks jelas dievaluasi
    const cropW = Math.min(520, meta.width ?? 800);
    const cropH = Math.min(150, meta.height ?? 600);
    const closeUp = await sharp(data)
      .extract({
        left: (meta.width ?? 800) - cropW,
        top: (meta.height ?? 600) - cropH,
        width: cropW,
        height: cropH,
      })
      .resize({ width: cropW * 2 })
      .webp()
      .toBuffer();
    variants.push({ nama: def.nama, opts: def.opts, hasil: data, closeUp });
  }

  const fig = (label: string, buf: Buffer, type: string, cap: string) =>
    `<figure><img src="data:${type};base64,${buf.toString("base64")}" alt="${label}"><figcaption>${cap}</figcaption></figure>`;

  const rows = variants
    .map(
      (v) =>
        `<section><h2>${v.nama}</h2>` +
        fig("hasil " + v.nama, v.hasil, "image/webp", "Hasil (full)") +
        fig("close-up " + v.nama, v.closeUp, "image/webp", "Close-up kanan-bawah (zoom ×2)") +
        `</section>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Uji Visual Watermark — Foto Interior Asli</title>
<style>
 body{font-family:system-ui;background:#111;color:#eee;margin:0;padding:24px;max-width:760px;margin-inline:auto}
 h1{font-size:17px} h2{font-size:14px;margin-top:28px}
 figure{margin:12px 0} img{width:100%;border-radius:8px;display:block}
 figcaption{font-size:11.5px;color:#999;margin-top:4px}
 p{font-size:12.5px;color:#bbb}
</style></head>
<body>
<h1>Uji Visual Watermark “jualrumahproperty.com” — foto interior asli (backup)</h1>
<p>Sumber: .backups/originals/properties/e2e6d462…/apt_hexa_room-1790041049764.jpeg — dimensi asli 828×1230.</p>
${fig("asli", orig, "image/jpeg", "SEBELUM — file asli tanpa watermark")}
${rows}
</body></html>`;

  fs.writeFileSync(OUT, html);
  console.log("HTML written:", OUT, html.length, "bytes; variants:", variants.length);
}

main();
