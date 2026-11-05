import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { watermarkPhoto } from "@/lib/image-watermark";
import { requireOperationalUser } from "@/lib/api-auth";
import { combinePropertyFilters } from "@/lib/services/property-listing-access";
import crypto from "crypto";

// =============================================================================
// POST /api/properties/[id]/media — Upload photo
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    // Verify property exists
    const property = await prisma.property.findFirst({
      where: combinePropertyFilters(guard.actor, { id }),
    });
    if (!property) {
      return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
    }

    // Check photo count
    const currentCount = await prisma.propertyMedia.count({
      where: { propertyId: id },
    });
    if (currentCount >= 20) {
      return NextResponse.json({ error: "Maksimal 20 foto" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const isPrimary = formData.get("isPrimary") === "true";
    const sortOrder = parseInt(formData.get("sortOrder") as string) || currentCount;
    const altText = (formData.get("altText") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate file hash for duplicate detection (hash file asli yang diupload)
    const fileHash = crypto.createHash("md5").update(buffer).digest("hex");

    // Terapkan watermark "jualrumahproperty.com" + konversi WebP sebelum masuk storage
    let processed: Buffer;
    let dimensions: { width: number; height: number };
    try {
      const result = await watermarkPhoto(buffer);
      processed = result.data;
      dimensions = { width: result.width, height: result.height };
    } catch {
      return NextResponse.json({ error: "File gambar tidak dapat dibaca" }, { status: 400 });
    }

    // Upload hasil ber-watermark via storage provider
    const storage = getStorage();
    const folder = `properties/${id}`;
    const webpName = `${file.name.replace(/\.[^.]+$/, "") || "foto"}.webp`;
    const result = await storage.upload(processed, webpName, folder, "image/webp");

    // If setting as primary, unset existing primary
    if (isPrimary) {
      await prisma.propertyMedia.updateMany({
        where: { propertyId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Create media record
    const media = await prisma.propertyMedia.create({
      data: {
        propertyId: id,
        type: "PHOTO",
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        fileHash,
        width: dimensions.width,
        height: dimensions.height,
        webpPath: result.filePath,
        hasWatermark: true,
        sortOrder,
        isPrimary,
        isPublic: true,
        altText: altText || null,
      },
    });

    return NextResponse.json({ media, url: result.url }, { status: 201 });
  } catch (error) {
    console.error("Upload media error:", error);
    return NextResponse.json({ error: "Gagal upload foto" }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/properties/[id]/media — Delete photo
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const { mediaId } = await request.json();

    const media = await prisma.propertyMedia.findFirst({
      where: {
        id: mediaId,
        propertyId: id,
        property: combinePropertyFilters(guard.actor, {}),
      },
    });

    if (!media) {
      return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });
    }

    // Delete file from storage
    const storage = getStorage();
    await storage.delete(media.filePath);

    // Delete record
    await prisma.propertyMedia.delete({ where: { id: mediaId } });

    // If was primary, set next photo as primary
    if (media.isPrimary) {
      const nextPhoto = await prisma.propertyMedia.findFirst({
        where: { propertyId: id },
        orderBy: { sortOrder: "asc" },
      });
      if (nextPhoto) {
        await prisma.propertyMedia.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete media error:", error);
    return NextResponse.json({ error: "Gagal hapus foto" }, { status: 500 });
  }
}

// =============================================================================
// PATCH /api/properties/[id]/media — Set primary photo
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;
  try {
    const { mediaId, isPrimary } = await request.json();

    const media = await prisma.propertyMedia.findFirst({
      where: {
        id: mediaId,
        propertyId: id,
        property: combinePropertyFilters(guard.actor, {}),
      },
      select: { id: true },
    });
    if (!media) {
      return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });
    }

    if (isPrimary) {
      await prisma.propertyMedia.updateMany({
        where: { propertyId: id, isPrimary: true },
        data: { isPrimary: false },
      });
      await prisma.propertyMedia.update({
        where: { id: media.id },
        data: { isPrimary: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update media error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status foto" }, { status: 500 });
  }
}
