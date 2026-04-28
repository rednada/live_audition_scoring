import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUploadDir, getPublicUrl } from "@/lib/storage";
import * as fs from "fs";
import * as path from "path";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const actorId = formData.get("actorId") as string;
  const photoType = formData.get("type") as string;
  const file = formData.get("file") as File | null;

  if (!actorId || !photoType || !file) {
    return NextResponse.json({ error: "Missing actorId, type or file" }, { status: 400 });
  }

  const allowedTypes = ["front_half", "left_half", "right_half", "left_full", "right_full", "tattoo"];
  if (!allowedTypes.includes(photoType)) {
    return NextResponse.json({ error: "Invalid photo type" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${photoType}.${ext}`;
  const subDir = `actor_${actorId}`;
  const dir = ensureUploadDir(subDir);
  const filePath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const publicUrl = getPublicUrl(subDir, filename);

  // Upsert photo record
  const existing = await prisma.actorPhoto.findFirst({
    where: { actorId: parseInt(actorId), type: photoType },
  });

  if (existing) {
    await prisma.actorPhoto.update({
      where: { id: existing.id },
      data: { filePath: publicUrl },
    });
  } else {
    await prisma.actorPhoto.create({
      data: { actorId: parseInt(actorId), type: photoType, filePath: publicUrl },
    });
  }

  return NextResponse.json({ url: publicUrl });
}
