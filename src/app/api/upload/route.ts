import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const maxSize =
    file.type.startsWith("video/") || file.type.startsWith("audio/")
      ? 100 * 1024 * 1024
      : 15 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      {
        error:
          file.type.startsWith("video/") || file.type.startsWith("audio/")
            ? "File too large (max 100MB for recordings)"
            : "File too large (max 15MB)",
      },
      { status: 400 }
    );
  }

  const saved = await saveUpload(file, session!.user.organizationId || "shared");
  return NextResponse.json(saved);
}
