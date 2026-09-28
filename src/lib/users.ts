import "server-only";

import { prisma } from "@/lib/prisma";
import { isRole, type Role } from "@/lib/roles";

// Data access for staff accounts (managers and teachers). Server-only. Staff
// are Better Auth `User` rows; the role lives on the user.

export type StaffListItemDTO = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string; // ISO
};

const SEARCH_FIELDS = ["name", "email", "phone"] as const;

// List/search staff. `search` matches name, email or phone.
export async function listStaff(params: {
  search?: string;
} = {}): Promise<StaffListItemDTO[]> {
  const search = params.search?.trim();

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: SEARCH_FIELDS.map((field) => ({
            [field]: { contains: search, mode: "insensitive" as const },
          })),
        }
      : undefined,
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: isRole(user.role) ? user.role : "teacher",
    createdAt: user.createdAt.toISOString(),
  }));
}
