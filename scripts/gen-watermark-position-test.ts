// Satu kali pakai: uji visual POSISI watermark pada foto interior sungguhan —
// render 4 posisi (kanan-bawah/kiri-bawah/kanan-atas/kiri-atas) lalu buat
// halaman HTML perbandingan dengan data URI (full + close-up kuadran terkait).
import fs from "fs";
import sharp from "sharp";
import { watermarkPhoto, WATERMARK_TEXT } from "../src/lib/image-watermark";

const ORIG = ".backups/originals/properties/e2e6d462-6990-460f-a197-85d76da8f6f8/apt_hexa_room-1790041049764.jpeg";
const OUT = "mockups/watermark-position-test.html";

async function main(): Promise<void> {
  const orig = fs.readFileSync(ORIG);
  const positions = [
    { key: "bottom-right", nama: "Kanan-bawah — default (konvensi REA Group)" },
    { key: "bottom-left", nama: "Kiri-bawah" },
    { key: "top-right", nama: "Kanan-atas" },
    { key: "top-left", nama: "Kiri-atas — gaya logo portal (Rumah123/99.co lazim di sini)" },
  ] as const;

  const fig = (label: string, buf: Buffer, type: string, cap: string) =>
    `<figure><img src="data:${type};base64,${buf.toString("base64")}" alt="${label}"><figcaption>${cap}</figcaption></figure>`;

  const sections: string[] = [];
  for (const pos of positions) {
    const { data } = await watermarkPhoto(orig, { style: "corner", position: pos.key, text: WATERMARK_TEXT });
    const meta = await sharp(data).metadata();
    const W = meta.width ?? 800, H = meta.height ?? 600;
    const top = pos.key.startsWith("top");
    const left = pos.key.includes("left");
    const cropW = Math.min(520, W), cropH = Math.min(170, H);
    const closeUp = await sharp(data)
      .extract({ left: left ? 0 : W - cropW, top: top ? 0 : H - cropH, width: cropW, height: cropH })
      .resize({ width: cropW * 2 })
      .webp().toBuffer();
    sections.push(
      `<section><h2>${pos.nama}</h2>` +
      fig(pos.key, data, "image/webp", `Hasil — posisi ${pos.key}`) +
      fig("zoom " + pos.key, closeUp, "image/webp", "Close-up kuadran (zoom ×2)") +
      `</section>`,
    );
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Uji Posisi Watermark — Foto Interior Asli</title>
<style>
 body{font-family:system-ui;background:#111;color:#eee;margin:0;padding:24px;max-width:760px;margin-inline:auto}
 h1{font-size:17px} h2{font-size:14px;margin-top:28px}
 figure{margin:12px 0} img{width:100%;border-radius:8px;display:block}
 figcaption{font-size:11.5px;color:#999;margin-top:4px} p{font-size:12.5px;color:#bbb}
</style></head>
<body>
<h1>Uji Posisi Watermark “jualrumahproperty.com” — pilih meniru portal mana</h1>
<p>Foto asli 828×1230. Default saat ini: kanan-bawah (satu-satunya standar eksplisit yang ditemukan — panduan REA Group; portal Indonesia tidak mewajibkan sudut tertentu).</p>
${sections.join("\n")}
</body></html>`;

  fs.writeFileSync(OUT, html);
  console.log("HTML written:", OUT, html.length, "bytes; posisi:", positions.length);
}

main();
