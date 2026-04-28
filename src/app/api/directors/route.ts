import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const directors = await prisma.director.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, ssoId: true, displayName: true },
  });
  return NextResponse.json(directors);
}
