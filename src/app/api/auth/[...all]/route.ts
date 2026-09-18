import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mounts Better Auth at /api/auth/*. Exports every method the handler
// supports so sign-in/sign-out/session endpoints all work.
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
