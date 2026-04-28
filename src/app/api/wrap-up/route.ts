import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const stage = searchParams.get("stage");

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = parseInt(sessionId);
  if (stage) where.stage = stage;

  // Get actors with their scores and wrap-up info
  const actors = await prisma.actor.findMany({
    where: {
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      stage: stage ?? undefined,
      scores: { some: {} }, // only actors with at least one score
    },
    include: {
      photos: { where: { type: "front_half" } },
      scores: {
        include: { director: { select: { id: true, displayName: true } } },
      },
      wrapUp: true,
    },
    orderBy: { auditionNumber: "desc" },
  });

  // Compute avg score for each actor
  const result = actors.map((actor) => {
    const avgScore =
      actor.scores.length > 0
        ? actor.scores.reduce((sum, s) => sum + s.stars, 0) / actor.scores.length
        : 0;
    return {
      ...actor,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  });

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "casting") {
    return NextResponse.json({ error: "Unauthorized - Casting only" }, { status: 403 });
  }

  const body = await req.json();
  const { actorId, sessionId, stage, house, role, note, action } = body;

  const wrapUp = await prisma.wrapUp.upsert({
    where: { actorId },
    update: { house, role, note, action },
    create: { actorId, sessionId, stage, house, role, note, action },
  });

  return NextResponse.json(wrapUp);
}
