import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "casting") {
    return NextResponse.json({ error: "Unauthorized - Casting only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const stage = searchParams.get("stage");

  const actors = await prisma.actor.findMany({
    where: {
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      stage: stage ?? undefined,
      scores: { some: {} },
    },
    include: {
      scores: {
        include: { director: { select: { displayName: true } } },
      },
      wrapUp: true,
    },
    orderBy: { auditionNumber: "asc" },
  });

  // Collect all unique directors
  const directorNames = Array.from(
    new Set(
      actors.flatMap((a) => a.scores.map((s) => s.director.displayName))
    )
  ).sort();

  const rows = actors.map((actor) => {
    const avg =
      actor.scores.length > 0
        ? actor.scores.reduce((s, sc) => s + sc.stars, 0) / actor.scores.length
        : 0;

    const row: Record<string, string | number> = {
      甄选编号: actor.auditionNumber,
      姓名: actor.name,
      手机号: actor.phone,
      身高: actor.height,
      体重: actor.weight,
      纹身: actor.hasTattoo ? "有" : "无",
      场次: actor.sessionId.toString(),
      阶段: actor.stage,
    };

    directorNames.forEach((name) => {
      const score = actor.scores.find((s) => s.director.displayName === name);
      row[`${name}-分数`] = score ? score.stars : "";
      row[`${name}-House`] = score?.house ?? "";
      row[`${name}-Role`] = score?.role ?? "";
      row[`${name}-Note`] = score?.note ?? "";
    });

    row["平均分"] = Math.round(avg * 10) / 10;
    row["Wrap Up House"] = actor.wrapUp?.house ?? "";
    row["Wrap Up Role"] = actor.wrapUp?.role ?? "";
    row["Wrap Up Note"] = actor.wrapUp?.note ?? "";
    row["Action"] = actor.wrapUp?.action ?? "";

    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Audition Results");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audition_results.xlsx"`,
    },
  });
}
