import { type NextRequest } from "next/server";

import { handleImageUpload } from "@/lib/image-upload";

// Manager-only image upload for subjects → /uploads/subjects/<id>.<ext>.
export async function POST(request: NextRequest) {
  return handleImageUpload(request, "subjects");
}
