import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { watermarkPhoto } from "@/lib/image-watermark";
import { getStorage } from "@/lib/storage";

export async function POST(req:Request, ctx:{params:Promise<{id:string}>}) {
  const {id}=await ctx.params;
  const row=await prisma.auctionRecord.findUnique({where:{id},select:{id:true}});
  if(!row) return Response.json({error:"Catatan tidak ditemukan"},{status:404});
  const form=await req.formData(); const file=form.get("file");
  if(!(file instanceof File) || !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>10*1024*1024 || !file.size) return Response.json({error:"Foto harus JPG/PNG/WebP maksimal 10 MB"},{status:400});
  let bytes:Buffer;
  try {
    const marked=await watermarkPhoto(Buffer.from(await file.arrayBuffer()), {style:"tiled"});
    bytes=marked.data;
  }
  catch {return Response.json({error:"File gambar tidak dapat dibaca"},{status:400});}

  const storage = getStorage();
  const uploadResult = await storage.upload(bytes, `${randomUUID()}.webp`, `auctions/${id}`, "image/webp");
  const photoUrl = uploadResult.url;

  try {
    // Serialize updates so concurrent uploads cannot replace one another's array.
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM auction_records WHERE id = ${id} FOR UPDATE`;
      const current=await tx.auctionRecord.findUniqueOrThrow({where:{id}});
      const photos=Array.isArray(current.photos)?current.photos:[];
      if(photos.length>=30) throw new Error("PHOTO_LIMIT");
      await tx.auctionRecord.update({where:{id},data:{photos:[...photos, photoUrl]}});
    });
    return Response.json({url: photoUrl},{status:201});
  } catch {
    await storage.delete(uploadResult.filePath).catch(()=>{});
    return Response.json({error:"Foto gagal disimpan atau batas 30 foto sudah tercapai"},{status:400});
  }
}

