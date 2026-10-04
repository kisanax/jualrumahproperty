/**
 * generate-category-icons.mjs
 * ───────────────────────────
 * Membuat ulang ikon kategori portal sebagai ANIMATED WEBP 96×96
 * (menggantikan GIF lama 48×48 yang kualitasnya timpang), plus
 * still WebP untuk state tombol tidak aktif.
 *
 * Jalankan:  node scripts/generate-category-icons.mjs
 * Output  :  public/brand/category-<nama>.webp        (animasi, saat aktif)
 *            public/brand/category-<nama>-still.webp  (statis, saat nonaktif)
 *
 * Kualitas & gaya mengacu ke category-rumah.gif (24 frame @40ms, aksen
 * oranye-merah #D04010): di sini dipadatkan jadi 12 frame @80ms dengan
 * animasi bounce halus + elemen "menyala" bergantian, warna brand #C24F36.
 */
import sharp from "sharp";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/brand");
const SIZE = 96;
const FRAMES = 12;
const DELAY_MS = 80;

const C = {
  primary: "#C24F36", // portal-action (terracotta)
  primarySoft: "#F3DDD4",
  ink: "#3A3833",
  glow: "#F2B33D",
  white: "#FFFFFF",
};

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 96 96">${inner}</svg>`;

/* Animasi global: bounce mulus 0→1→0 dalam satu loop (cos), pivot di (48,60). */
function bounce(t) {
  const lift = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
  return { ty: -(5 * lift), s: 1 + 0.06 * lift };
}
const gTransform = ({ ty, s }) =>
  `<g transform="translate(48 60) scale(${s.toFixed(4)}) translate(-48 -60) translate(0 ${ty.toFixed(2)})">`;
const gEnd = () => `</g>`;

/* Denyut periodik untuk elemen "menyala". phase = offset antar elemen. */
const pulse = (t, phase, hi = 1, lo = 0.25) =>
  (0.5 - 0.5 * Math.cos(4 * Math.PI * (t + phase))) * (hi - lo) + lo;

const rect = (x, y, w, h, r, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${extra}/>`;
const line = (x1, y1, x2, y2, extra) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
const circle = (cx, cy, r, extra) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;

const S = `stroke-linecap="round" stroke-linejoin="round"`;

const ICONS = [
  {
    name: "semua",
    draw(t) {
      const lit = Math.floor(t * 4) % 4;
      const cells = [
        [18, 18],
        [52, 18],
        [18, 52],
        [52, 52],
      ];
      const inner = cells
        .map(([x, y], i) =>
          rect(x, y, 26, 26, 8,
            `fill="${i === lit ? C.primary : C.primarySoft}" stroke="${C.primary}" stroke-width="3.5"`)
        )
        .join("");
      return gTransform(bounce(t)) + inner + gEnd();
    },
  },
  {
    name: "rumah",
    draw(t) {
      const b = bounce(t);
      const win = pulse(t, 0).toFixed(2);
      return (
        gTransform(b) +
        `<path d="M22 46 L48 24 L74 46" fill="none" stroke="${C.primary}" stroke-width="5.5" ${S}/>` +
        rect(30, 46, 36, 24, 3, `fill="${C.white}" stroke="${C.primary}" stroke-width="5" ${S}`) +
        rect(43, 58, 10, 12, 2, `fill="${C.primary}"`) +
        circle(48, 37, 4.5, `fill="${C.glow}" opacity="${win}"`) +
        gEnd()
      );
    },
  },
  {
    name: "apartemen",
    draw(t) {
      const b = bounce(t);
      let inner = rect(34, 22, 28, 48, 3, `fill="${C.white}" stroke="${C.primary}" stroke-width="5" ${S}`);
      inner += line(48, 22, 48, 15, `stroke="${C.primary}" stroke-width="4" ${S}`) + circle(48, 13, 2.5, `fill="${C.primary}"`);
      const wins = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const o = pulse(t, (row * 2 + col) / 6).toFixed(2);
          wins.push(rect(40 + col * 11, 29 + row * 11, 6, 7, 1.5, `fill="${C.glow}" opacity="${o}"`));
        }
      }
      inner += wins.join("");
      inner += rect(43, 60, 10, 10, 2, `fill="${C.primary}"`);
      return gTransform(b) + inner + gEnd();
    },
  },
  {
    name: "tanah",
    draw(t) {
      const b = bounce(t);
      const sun = pulse(t, 0.25, 1, 0.35).toFixed(2);
      return (
        gTransform(b) +
        `<path d="M44 64 Q66 46 86 64" fill="none" stroke="${C.primary}" stroke-width="5" ${S}/>` +
        line(12, 64, 84, 64, `stroke="${C.ink}" stroke-width="4" ${S}`) +
        line(26, 63, 26, 40, `stroke="${C.ink}" stroke-width="4" ${S}`) +
        rect(17, 30, 18, 11, 2, `fill="${C.primary}"`) +
        circle(72, 24, 6, `fill="${C.glow}" opacity="${sun}"`) +
        gEnd()
      );
    },
  },
  {
    name: "ruko",
    draw(t) {
      const b = bounce(t);
      const l1 = pulse(t, 0).toFixed(2);
      const l2 = pulse(t, 0.5).toFixed(2);
      let inner = rect(26, 30, 44, 40, 3, `fill="${C.white}" stroke="${C.primary}" stroke-width="5" ${S}`);
      inner += rect(24, 39, 48, 9, 2, `fill="${C.primarySoft}" stroke="${C.primary}" stroke-width="3" ${S}`);
      for (const x of [32, 41, 50, 59]) inner += line(x, 40, x, 47, `stroke="${C.primary}" stroke-width="2.5"`);
      inner += rect(32, 31, 9, 6, 1.5, `fill="${C.glow}" opacity="${l1}"`);
      inner += rect(55, 31, 9, 6, 1.5, `fill="${C.glow}" opacity="${l2}"`);
      inner += rect(42, 54, 12, 16, 2, `fill="${C.primary}"`);
      return gTransform(b) + inner + gEnd();
    },
  },
];

async function renderFrameRgba(svg) {
  const { data } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const icon of ICONS) {
    /* 1) Render semua frame RGBA */
    const frames = [];
    for (let f = 0; f < FRAMES; f++) {
      frames.push(await renderFrameRgba(wrap(icon.draw(f / FRAMES))));
    }

    /* 2) Encode GIF intermediate (dgn alpha) */
    const gif = GIFEncoder();
    for (const rgba of frames) {
      const palette = quantize(rgba, 256, { format: "rgba4444" });
      const index = applyPalette(rgba, palette, "rgba4444");
      gif.writeFrame(index, SIZE, SIZE, {
        palette,
        delay: DELAY_MS,
        transparent: true,
        dispose: 2,
        repeat: 0,
      });
    }
    gif.finish();
    const gifBuf = Buffer.from(gif.bytes());

    /* 3) Transcode → animated WebP (ukuran final yang dipakai situs) */
    const webpPath = path.join(OUT, `category-${icon.name}.webp`);
    await sharp(gifBuf, { animated: true })
      .webp({ quality: 82, alphaQuality: 90, effort: 5 })
      .toFile(webpPath);

    /* 4) Still WebP (frame netral t=0 → scale 1, posisi diam) */
    const stillPath = path.join(OUT, `category-${icon.name}-still.webp`);
    const stillBuf = await sharp(Buffer.from(wrap(icon.draw(0))))
      .webp({ quality: 90, alphaQuality: 95 })
      .toBuffer();
    writeFileSync(stillPath, stillBuf);

    const meta = await sharp(gifBuf, { animated: true }).metadata();
    const kb = (p) => (statSync(p).size / 1024).toFixed(1) + "KB";
    console.log(
      `category-${icon.name}.webp  ${kb(webpPath).padStart(7)}  pages=${meta.pages}  delay=${meta.pageDelay ?? meta.delay ?? "?"}ms  |  still ${kb(stillPath)}`
    );
  }
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
