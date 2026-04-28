import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "director") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const director = await prisma.director.findUnique({ where: { ssoId: user.ssoId } });
  if (!director) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const stage = searchParams.get("stage");

  const where: Record<string, unknown> = { directorId: director.id };
  if (sessionId) where.sessionId = parseInt(sessionId);
  if (stage) where.stage = stage;

  const drafts = await prisma.scoreDraft.findMany({ where });
  return NextResponse.json(drafts);
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "director") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const director = await prisma.director.findUnique({ where: { ssoId: user.ssoId } });
  if (!director) return NextResponse.json({ error: "Director not found" }, { status: 404 });

  const body = await req.json();
  const { actorId, sessionId, stage, data } = body;

  const draft = await prisma.scoreDraft.upsert({
    where: {
      directorId_actorId_sessionId_stage: {
        directorId: director.id,
        actorId,
        sessionId,
        stage,
      },
    },
    update: { data: JSON.stringify(data) },
    create: {
      directorId: director.id,
      actorId,
      sessionId,
      stage,
      data: JSON.stringify(data),
    },
  });

  return NextResponse.json(draft);
}
