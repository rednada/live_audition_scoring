import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const stage = searchParams.get("stage");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
  const onlyScored = searchParams.get("onlyScored") === "true";
  const excludeScored = searchParams.get("excludeScored") === "true";

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = parseInt(sessionId);
  if (stage) where.stage = stage;
  if (from || to) {
    where.auditionNumber = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  // Filter by scored/unscored for the current director
  if (onlyScored || excludeScored) {
    const user = await getSession();
    if (user?.role === "director") {
      const director = await prisma.director.findUnique({ where: { ssoId: user.ssoId } });
      if (director) {
        const scoreWhere: Record<string, unknown> = { directorId: director.id };
        if (sessionId) scoreWhere.sessionId = parseInt(sessionId);
        if (stage) scoreWhere.stage = stage;
        const scored = await prisma.score.findMany({
          where: scoreWhere,
          select: { actorId: true },
        });
        const scoredIds = scored.map((s) => s.actorId);
        where.id = onlyScored ? { in: scoredIds } : { notIn: scoredIds };
      }
    }
  }

  const [actors, total] = await Promise.all([
    prisma.actor.findMany({
      where,
      include: { photos: true },
      orderBy: { auditionNumber: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.actor.count({ where }),
  ]);

  return NextResponse.json({ actors, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { auditionNumber, name, phone, height, weight, hasTattoo, sessionId, stage } = body;

  const existing = await prisma.actor.findUnique({
    where: { auditionNumber_sessionId_stage: { auditionNumber, sessionId, stage } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "duplicate", actorId: existing.id, message: "您已签到成功" },
      { status: 409 }
    );
  }

  const actor = await prisma.actor.create({
    data: { auditionNumber, name, phone, height, weight, hasTattoo, sessionId, stage },
  });

  return NextResponse.json(actor, { status: 201 });
}
