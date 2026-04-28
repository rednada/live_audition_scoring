import * as fs from "fs";
import * as path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function ensureUploadDir(subDir?: string): string {
  const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getUploadPath(subDir: string, filename: string): string {
  return path.join(UPLOAD_DIR, subDir, filename);
}

export function getPublicUrl(subDir: string, filename: string): string {
  return `/api/files/${subDir}/${filename}`;
}

export function deleteFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore if file doesn't exist
  }
}
