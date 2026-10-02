import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { MANAGER_ROLE } from "@/lib/roles";

// Manager-only image uploads. Stores files under `public/uploads/<folder>/` and
// returns the public URL. Every route handler is treated as a public endpoint
// and re-checks the role (see AGENTS.md).

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function handleImageUpload(
  request: NextRequest,
  folder: string,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  if (user.role !== MANAGER_ROLE) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Alleen PNG, JPG, WEBP, GIF of SVG is toegestaan" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Bestand is groter dan 2 MB" },
      { status: 400 },
    );
  }

  const directory = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(directory, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, filename), bytes);

  return NextResponse.json({ url: `/uploads/${folder}/${filename}` });
}
