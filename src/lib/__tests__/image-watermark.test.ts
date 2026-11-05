import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildWatermarkSvg, WATERMARK_TEXT, watermarkPhoto } from "../image-watermark";

async function createTestJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#3b82f6" },
  })
    .jpeg()
    .toBuffer();
}

describe("buildWatermarkSvg", () => {
  it("berisi teks watermark dan cocok dengan dimensi tujuan", () => {
    const svg = buildWatermarkSvg(640, 480);
    expect(svg).toContain(WATERMARK_TEXT);
    expect(svg).toContain(`width="640"`);
    expect(svg).toContain(`height="480"`);
  });

  it("memakai teks kustom saat diberikan", () => {
    expect(buildWatermarkSvg(640, 480, { text: "contoh.com" })).toContain("contoh.com");
  });

  it("style tiled menghasilkan elemen teks berulang", () => {
    const tiled = buildWatermarkSvg(1920, 1280, { style: "tiled" });
    const corner = buildWatermarkSvg(1920, 1280, { style: "corner" });
    expect(tiled.split("<text").length).toBeGreaterThan(corner.split("<text").length);
  });
});

describe("watermarkPhoto", () => {
  it("menghasilkan WebP bertanda air dengan dimensi asli (di bawah batas)", async () => {
    const input = await createTestJpeg(640, 480);
    const result = await watermarkPhoto(input);

    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.data.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(result.data.subarray(8, 12).toString("latin1")).toBe("WEBP");
  });

  it("mengecilkan foto besar ke sisi maksimum 1920px", async () => {
    const input = await createTestJpeg(4000, 3000);
    const result = await watermarkPhoto(input);

    expect(result.width).toBe(1920);
    expect(result.height).toBe(1440);
  });

  it("foto lanskap besar tetap fit inside tanpa memotong", async () => {
    const input = await createTestJpeg(800, 100);
    const result = await watermarkPhoto(input);
    expect(result.width).toBe(800);
    expect(result.height).toBe(100);
  });

  it("gagal jelas saat input bukan gambar", async () => {
    await expect(watermarkPhoto(Buffer.from("bukan gambar"))).rejects.toThrow();
  });
});
