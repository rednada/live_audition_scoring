import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const houseId = searchParams.get("houseId");
  const roleQuery = searchParams.get("role");

  if (houseId) {
    const roles = await prisma.role.findMany({
      where: {
        houseId: parseInt(houseId),
        ...(roleQuery ? { name: { contains: roleQuery } } : {}),
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(roles);
  }

  const houses = await prisma.house.findMany({
    orderBy: { name: "asc" },
    include: { roles: { orderBy: { name: "asc" } } },
  });
  return NextResponse.json(houses);
}
