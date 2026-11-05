/**
 * Backfill watermark untuk foto properti yang sudah ada.
 *
 *   npx tsx scripts/watermark-media.ts            # dry run (tidak menulis apa pun)
 *   npx tsx scripts/watermark-media.ts --apply    # jalankan sungguhan
 *
 * Proses per foto (type PHOTO):
 *   1. Baca file asli — path lokal (`properties/<id>/x.jpg` → public/uploads)
 *      atau URL R2 (diambil via API S3/R2, bukan lewat r2.dev publik).
 *   2. watermarkPhoto(): EXIF rotate, maks 1920px, watermark "jualrumahproperty.com".
 *   3. Upload hasil WebP ke storage, folder yang sama.
 *   4. Update record: filePath/webpPath baru, width, height, fileName, fileSize,
 *      mimeType, hasWatermark=true. fileHash tetap milik file asli karena dihitung
 *      dari file sumber, jadi deteksi duplikat tetap bekerja.
 *   5. Backup asli ke `.backups/originals/<rel>` (di luar public/, tidak bisa
 *      diakses lewat URL) lalu hapus objek lama, sehingga tidak ada salinan
 *      tanpa watermark yang masih bisa diambil publik.
 *
 * Idempoten: record dengan hasWatermark=true dilewati.
 */

import { promises as fs } from "fs";
import { readFileSync } from "fs";
import path from "path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { watermarkPhoto } from "../src/lib/image-watermark";
import { getStorage } from "../src/lib/storage";

const APPLY = process.argv.includes("--apply");
const BACKUP_ROOT = path.join(process.cwd(), ".backups", "originals");

function loadEnvFile(file: string): void {
  try {
    const raw = readFileSync(path.resolve(process.cwd(), file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env) && value !== "") process.env[key] = value;
    }
  } catch {
    // file env opsional
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function readSource(filePath: string): Promise<{ bytes: Buffer; relPath: string }> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucket = process.env.R2_BUCKET_NAME;
    let key: string | null = null;
    try {
      key = new URL(filePath).pathname.replace(/^\/+/, "");
    } catch {
      key = null;
    }
    if (!accountId || !bucket || !key) {
      throw new Error(`Tidak dapat menentukan key R2 untuk ${filePath}`);
    }
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
    try {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!object.Body) throw new Error("Body R2 kosong");
      return { bytes: Buffer.from(await object.Body.transformToByteArray()), relPath: key };
    } finally {
      client.destroy();
    }
  }
  const relPath = filePath.replace(/^\/uploads\//, "").replace(/^\/+/, "");
  return { bytes: await fs.readFile(path.join(process.cwd(), "public", "uploads", relPath)), relPath };
}

interface Report {
  apply: boolean;
  candidates: number;
  skippedAlreadyWatermarked: number;
  processed: string[];
  failed: Array<{ id: string; filePath: string; error: string }>;
}

async function main(): Promise<void> {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const prisma = new PrismaClient();
  const report: Report = {
    apply: APPLY,
    candidates: 0,
    skippedAlreadyWatermarked: 0,
    processed: [],
    failed: [],
  };

  try {
    const [media, alreadyWatermarked] = await Promise.all([
      prisma.propertyMedia.findMany({
        where: { type: "PHOTO", hasWatermark: false }, // non-nullable per schema; idempoten otomatis karena record yang sudah diproses bertanda true
        select: { id: true, propertyId: true, fileName: true, filePath: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.propertyMedia.count({ where: { type: "PHOTO", hasWatermark: true } }),
    ]);
    report.candidates = media.length;
    report.skippedAlreadyWatermarked = alreadyWatermarked;
    console.log(
      `Kandidat backfill: ${media.length} foto (sudah berwatermark: ${alreadyWatermarked}; mode: ${APPLY ? "APPLY" : "dry-run"})`,
    );

    const storage = getStorage();
    for (const row of media) {
      try {
        const source = await readSource(row.filePath);
        const marked = await watermarkPhoto(source.bytes);

        if (!APPLY) {
          report.processed.push(`${row.id} (dry-run) → ${row.filePath}`);
          continue;
        }

        const base = row.fileName.replace(/\.[^.]+$/, "") || "foto";
        const upload = await storage.upload(
          marked.data,
          `${base}.webp`,
          `properties/${row.propertyId}`,
          "image/webp",
        );

        await prisma.propertyMedia.update({
          where: { id: row.id },
          data: {
            fileName: upload.fileName,
            filePath: upload.filePath,
            webpPath: upload.filePath,
            fileSize: upload.fileSize,
            mimeType: "image/webp",
            width: marked.width,
            height: marked.height,
            hasWatermark: true,
          },
        });

        // Backup asli ke luar public/ sebelum objek lama dihapus dari storage.
        await fs.mkdir(path.dirname(path.join(BACKUP_ROOT, source.relPath)), { recursive: true });
        await fs.writeFile(path.join(BACKUP_ROOT, source.relPath), source.bytes);

        if (upload.filePath !== row.filePath) {
          await storage.delete(row.filePath).catch((error: unknown) => {
            report.failed.push({
              id: row.id,
              filePath: row.filePath,
              error: `Hapus lama gagal (record sudah pindah): ${String(error)}`,
            });
          });
        }

        report.processed.push(`${row.id} → ${upload.filePath}`);
      } catch (error) {
        report.failed.push({ id: row.id, filePath: row.filePath, error: String(error) });
      }
    }
    console.log(`Selesai: ${report.processed.length} diproses, ${report.failed.length} gagal.`);
  } finally {
    await prisma.$disconnect();
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
