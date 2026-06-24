import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const body = await req.json();
    const name = body.name as string | undefined;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session!.user.id },
      data: { name: name.trim() },
      select: { id: true, image: true, name: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Profile name update failed:", err);
    return NextResponse.json({ error: "Failed to update profile name" }, { status: 500 });
  }
}
