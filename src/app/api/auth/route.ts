import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encodeSession, isDirectorId, isCastingId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { ssoId, displayName } = await req.json();

  if (!ssoId || !displayName) {
    return NextResponse.json({ error: "ssoId and displayName required" }, { status: 400 });
  }

  let role: "director" | "casting";

  if (isDirectorId(ssoId)) {
    role = "director";
    await prisma.director.upsert({
      where: { ssoId },
      update: { displayName },
      create: { ssoId, displayName },
    });
  } else if (isCastingId(ssoId)) {
    role = "casting";
  } else {
    return NextResponse.json(
      { error: "SSO ID 格式不正确，导演请使用2开头8位数字，甄选团队请使用3开头8位数字" },
      { status: 400 }
    );
  }

  const session = { ssoId, displayName, role };
  const token = encodeSession(session);

  const res = NextResponse.json({ success: true, role });
  res.cookies.set("las_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("las_session");
  return res;
}
