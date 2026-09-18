// Bootstrap script: creates the first manager account.
//
// Sign-up is disabled for security (staff accounts are created by managers),
// so the very first manager must be created out-of-band. Run after migrating:
//
//   pnpm db:seed
//
// Configure the account with SEED_MANAGER_EMAIL / SEED_MANAGER_PASSWORD
// (falls back to dev defaults below). The script is idempotent: it upserts the
// user by email and only sets a password when the account is new.

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { MANAGER_ROLE } from "../src/lib/roles";

const EMAIL = process.env.SEED_MANAGER_EMAIL ?? "manager@moskee.local";
const PASSWORD = process.env.SEED_MANAGER_PASSWORD ?? "change-me-123";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`Manager "${EMAIL}" already exists (role=${existing.role}), skipping.`);
    return;
  }

  const password = await hashPassword(PASSWORD);

  await prisma.user.create({
    data: {
      id: randomUUID(),
      name: "Manager",
      email: EMAIL,
      emailVerified: true,
      role: MANAGER_ROLE,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: EMAIL,
          providerId: "credential",
          password,
        },
      },
    },
  });

  console.log(`Created manager account "${EMAIL}".`);
  console.log("Change the password after first sign-in.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
