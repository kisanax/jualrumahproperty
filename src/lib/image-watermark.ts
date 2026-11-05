import sharp from "sharp";

/**
 * Watermark foto properti.
 *
 * Mengikuti keputusan branding di docs/PROGRESS.md ("Strategi Watermark & Branding
 * Elegan"): label halus, bukan cap tebal di tengah foto ala portal lama.
 *   - style "corner" (default): satu label di kanan bawah, outline tipis.
 *   - style "tiled": pola diagonal samar berulang (proteksi anti-crop).
 * Foto di-downscale ke maksimum 1920px (sesuai pola route foto lelang), EXIF rotate
 * diterapkan, hasil selalu WebP.
 */

export const WATERMARK_TEXT = "jualrumahproperty.com";

export interface WatermarkOptions {
  text?: string;
  style?: "corner" | "tiled";
  /** Ukuran font relatif terhadap lebar foto (0–1). Default 0.026. */
  scale?: number;
  /** Intensitas label 0–1. Default 0.72 hasil uji visual (varian B — subtle àla portal luxury). */
  opacity?: number;
  /** Posisi label. Default "bottom-right" — konvensi panduan REA Group. */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export interface WatermarkResult {
  data: Buffer;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1920;
const LIMIT_INPUT_PIXELS = 40_000_000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** SVG overlay dengan dimensi sama dengan foto tujuan; dikomposit sebagai layer atas. */
export function buildWatermarkSvg(
  width: number,
  height: number,
  options: WatermarkOptions = {},
): string {
  const text = escapeXml((options.text ?? WATERMARK_TEXT).trim() || WATERMARK_TEXT);
  const fontSize = Math.round(clamp(width * (options.scale ?? 0.026), 13, 56));
  const opacity = clamp(options.opacity ?? 0.72, 0, 1);
  const strokeOpacity = opacity * 0.45;
  const pad = Math.round(fontSize * 0.75);
  const outline = Math.max(1, Math.round(fontSize * 0.09));

  if ((options.style ?? "corner") === "corner") {
    const position = options.position ?? "bottom-right";
    const onRight = position.endsWith("right");
    const x = onRight ? width - pad : pad;
    const y = position.startsWith("top") ? pad + fontSize : height - pad;
    const anchor = onRight ? "end" : "start";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="none" stroke="#101010" stroke-opacity="${strokeOpacity.toFixed(2)}" stroke-width="${outline}">${text}</text>` +
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" fill-opacity="${opacity.toFixed(2)}">${text}</text>` +
      `</svg>`;
  }

  // Pola diagonal samar: baris offset bergantian, trayek naik -25°.
  const stepX = Math.max(Math.round(width * 0.55), 1);
  const stepY = Math.max(Math.round(height * 0.28), 1);
  const rows = Math.ceil(height / stepY) + 1;
  const cols = Math.ceil(width / stepX) + 1;
  const parts: string[] = [];
  for (let row = 0; row < rows; row++) {
    const y = row * stepY + stepY / 2;
    const stagger = row % 2 === 1 ? stepX / 2 : 0;
    for (let col = 0; col <= cols; col++) {
      const x = col * stepX + stagger - stepX / 2;
      parts.push(
        `<text x="${x}" y="${y}" text-anchor="middle" transform="rotate(-25 ${x} ${y})" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" fill-opacity="0.16">${text}</text>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join("")}</svg>`;
}

/** Dimensi keluaran dari resize "inside" tanpa pembesaran, dengan pertukaran w/h saat EXIF rotate. */
function targetDimensions(
  inputWidth: number,
  inputHeight: number,
  orientation: number | undefined,
): { width: number; height: number } {
  let width = inputWidth;
  let height = inputHeight;
  if (orientation && orientation >= 5 && orientation <= 8) {
    [width, height] = [height, width];
  }
  const scale = Math.min(1, MAX_DIMENSION / width, MAX_DIMENSION / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Baca foto (JPEG/PNG/WebP/HEIC apapun yang didukung sharp), terapkan watermark,
 * dan hasilkan WebP siap upload ke storage.
 */
export async function watermarkPhoto(
  input: Buffer,
  options: WatermarkOptions = {},
): Promise<WatermarkResult> {
  const pipeline = sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS }).rotate();
  const meta = await pipeline.metadata();
  const inputWidth = meta.width ?? 0;
  const inputHeight = meta.height ?? 0;
  if (!inputWidth || !inputHeight) {
    throw new Error("Tidak dapat membaca dimensi gambar");
  }
  const { width, height } = targetDimensions(inputWidth, inputHeight, meta.orientation);
  const overlay = Buffer.from(buildWatermarkSvg(width, height, options));

  const { data, info } = await pipeline
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height };
}
