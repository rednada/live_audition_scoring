import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const qr = await prisma.qRCode.findUnique({
      where: { code },
      include: { session: true },
    });
    if (!qr || !qr.isActive) {
      return NextResponse.json({ error: "二维码无效或已停用" }, { status: 404 });
    }
    return NextResponse.json(qr);
  }

  const qrCodes = await prisma.qRCode.findMany({
    include: { session: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(qrCodes);
}
