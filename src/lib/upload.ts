import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUpload(
  file: File,
  orgId: string
): Promise<{ path: string; name: string; mime: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const folder = path.join(UPLOAD_DIR, orgId || "shared");
  await mkdir(folder, { recursive: true });
  const filename = `${uuidv4()}-${safeName}`;
  const fullPath = path.join(folder, filename);
  await writeFile(fullPath, buffer);
  return {
    path: `/uploads/${orgId || "shared"}/${filename}`,
    name: file.name,
    mime: file.type || "application/octet-stream",
  };
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}
