// Satu kali pakai: buat halaman verifikasi visual WATERMARK (sebelum/sesudah)
// dari foto asli (backup) + hasil berwatermark, di-embed sebagai data URI.
import fs from "fs";

const origPath =
  ".backups/originals/properties/e2e6d462-6990-460f-a197-85d76da8f6f8/apt_hexa_room-1790041049764.jpeg";
const markedPath =
  "public/uploads/properties/e2e6d462-6990-460f-a197-85d76da8f6f8/apt_hexa_room-1790041049764-1792119181867.webp";

const orig = fs.readFileSync(origPath);
const marked = fs.readFileSync(markedPath);

const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verifikasi watermark jualrumahproperty.com</title>
<style>
  body{font-family:system-ui;background:#111;color:#eee;margin:0;padding:24px}
  h1{font-size:16px}
  figure{margin:16px 0;max-width:600px}
  img{width:100%;border-radius:8px;display:block}
  figcaption{font-size:12px;color:#999;margin-top:4px}
</style>
</head>
<body>
<h1>Verifikasi watermark “jualrumahproperty.com” — foto nyata listing apt hexa</h1>
<figure>
  <img src="data:image/jpeg;base64,${orig.toString("base64")}">
  <figcaption>SEBELUM — file asli (JPEG)</figcaption>
</figure>
<figure>
  <img src="data:image/webp;base64,${marked.toString("base64")}">
  <figcaption>SESUDAH — hasil upload/backfill (WebP 828×1230, label kanan bawah)</figcaption>
</figure>
</body>
</html>`;

fs.writeFileSync("mockups/watermark-check.html", html);
console.log("HTML written:", html.length, "bytes");
