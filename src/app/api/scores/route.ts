import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const stage = searchParams.get("stage");
  const actorId = searchParams.get("actorId");
  // all=true  → return every director's scores (casting view / "查看他人打分")
  // excludeSelf=true → exclude current director (only others)
  // default   → only current director's own scores
  const all = searchParams.get("all") === "true";
  const excludeSelf = searchParams.get("excludeSelf") === "true";

  const user = await getSession();

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = parseInt(sessionId);
  if (stage) where.stage = stage;
  if (actorId) where.actorId = parseInt(actorId);

  if (user?.role === "director") {
    const director = await prisma.director.findUnique({ where: { ssoId: user.ssoId } });
    if (director) {
      if (excludeSelf) {
        // "查看他人打分" — everyone except me
        where.directorId = { not: director.id };
      } else if (!all) {
        // default — only my own scores
        where.directorId = director.id;
      }
      // all=true — no directorId filter, return everyone
    }
  }

  const scores = await prisma.score.findMany({
    where,
    include: { director: { select: { id: true, displayName: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(scores);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "director") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const director = await prisma.director.findUnique({ where: { ssoId: user.ssoId } });
  if (!director) return NextResponse.json({ error: "Director not found" }, { status: 404 });

  const body = await req.json();
  // body is array of score submissions
  const items: Array<{
    actorId: number;
    sessionId: number;
    stage: string;
    stars: number;
    house?: string;
    role?: string;
    note?: string;
  }> = Array.isArray(body) ? body : [body];

  const results = await Promise.all(
    items.map((item) =>
      prisma.score.upsert({
        where: {
          directorId_actorId_sessionId_stage: {
            directorId: director.id,
            actorId: item.actorId,
            sessionId: item.sessionId,
            stage: item.stage,
          },
        },
        update: {
          stars: item.stars,
          house: item.house,
          role: item.role,
          note: item.note,
          submittedAt: new Date(),
        },
        create: {
          directorId: director.id,
          actorId: item.actorId,
          sessionId: item.sessionId,
          stage: item.stage,
          stars: item.stars,
          house: item.house,
          role: item.role,
          note: item.note,
        },
      })
    )
  );

  // Clear drafts for submitted actors
  await Promise.all(
    items.map((item) =>
      prisma.scoreDraft.deleteMany({
        where: {
          directorId: director.id,
          actorId: item.actorId,
          sessionId: item.sessionId,
          stage: item.stage,
        },
      })
    )
  );

  return NextResponse.json(results);
}
