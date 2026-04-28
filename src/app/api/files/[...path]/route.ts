import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = path.join(UPLOAD_DIR, ...segments);

  // Prevent directory traversal
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const contentType =
    ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

  return new NextResponse(buffer, {
    headers: { "Content-Type": contentType },
  });
}
