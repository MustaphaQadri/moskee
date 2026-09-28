// Bootstrap script: creates the first manager account and the default
// timeslots. Idempotent — safe to re-run.
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

// The weekend school runs 3 slots per day (morning/noon/afternoon) on Saturday
// and Sunday. These are the 6 fixed defaults; managers can add more later.
const DEFAULT_SESSIONS = [
  { label: "Zaterdag ochtend", day: "Zaterdag", startTime: "09:00", endTime: "12:00" },
  { label: "Zaterdag middag", day: "Zaterdag", startTime: "12:00", endTime: "15:00" },
  { label: "Zaterdag namiddag", day: "Zaterdag", startTime: "15:00", endTime: "18:00" },
  { label: "Zondag ochtend", day: "Zondag", startTime: "09:00", endTime: "12:00" },
  { label: "Zondag middag", day: "Zondag", startTime: "12:00", endTime: "15:00" },
  { label: "Zondag namiddag", day: "Zondag", startTime: "15:00", endTime: "18:00" },
];

async function seedSessions() {
  for (const session of DEFAULT_SESSIONS) {
    await prisma.classSession.upsert({
      where: { label: session.label },
      update: {
        day: session.day,
        startTime: session.startTime,
        endTime: session.endTime,
      },
      create: session,
    });
  }
  console.log(`Ensured ${DEFAULT_SESSIONS.length} default timeslots.`);
}

async function seedManager() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`Manager "${EMAIL}" already exists (role=${existing.role}), skipping.`);
    return;
  }

  const password = await hashPassword(PASSWORD);
  const userId = randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      name: "Manager",
      email: EMAIL,
      emailVerified: true,
      role: MANAGER_ROLE,
      accounts: {
        create: {
          id: randomUUID(),
          // For the credential provider Better Auth expects accountId to be the
          // user id (it matches providerId="credential" AND accountId=user.id).
          accountId: userId,
          providerId: "credential",
          password,
        },
      },
    },
  });

  console.log(`Created manager account "${EMAIL}".`);
  console.log("Change the password after first sign-in.");
}

async function main() {
  await seedSessions();
  await seedManager();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
