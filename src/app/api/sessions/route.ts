import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: [{ date: "asc" }, { category: "asc" }],
    include: {
      qrCodes: { where: { isActive: true } },
    },
  });
  return NextResponse.json(sessions);
}
