import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as crypto from "crypto";

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter } as any);

const SESSIONS = [
  { name: "2026 秋季活动普通群演", date: "2026-05-06", category: "普通群演" },
  { name: "2026 秋季活动特型演员", date: "2026-05-06", category: "特型演员" },
  { name: "2026 秋季活动普通群演", date: "2026-05-08", category: "普通群演" },
  { name: "2026 秋季活动特型演员", date: "2026-05-08", category: "特型演员" },
  { name: "2026 秋季活动女流行舞舞者", date: "2026-05-09", category: "女流行舞舞者" },
  { name: "2026 秋季活动专业演员", date: "2026-05-07", category: "专业演员" },
  { name: "2026 秋季活动专业演员", date: "2026-05-09", category: "专业演员" },
];

const HOUSES = [
  {
    name: "Hollywood",
    roles: ["Actor A", "Actor B", "Dancer", "Stunt Performer", "Extra"],
  },
  {
    name: "Adventure",
    roles: ["Hero", "Villain", "Sidekick", "Crowd Member", "Mascot Performer"],
  },
  {
    name: "Fantasy",
    roles: ["Wizard", "Fairy", "Knight", "Dragon Performer", "Princess", "Prince"],
  },
  {
    name: "Sci-Fi",
    roles: ["Alien", "Robot", "Space Explorer", "Commander", "Engineer"],
  },
  {
    name: "Horror",
    roles: ["Monster", "Zombie", "Vampire", "Witch", "Ghost"],
  },
];

function generateCode(sessionId: number, stage: string): string {
  return crypto
    .createHash("md5")
    .update(`${sessionId}-${stage}-${Date.now()}`)
    .digest("hex")
    .slice(0, 12);
}

async function main() {
  console.log("Seeding database...");

  // Sessions
  const createdSessions: { id: number }[] = [];
  for (const s of SESSIONS) {
    const session = await prisma.session.upsert({
      where: { id: SESSIONS.indexOf(s) + 1 },
      update: {},
      create: s,
    });
    createdSessions.push(session);

    // QR codes for each stage
    for (const stage of ["Preliminary", "Call Back"]) {
      const existing = await prisma.qRCode.findFirst({
        where: { sessionId: session.id, stage },
      });
      if (!existing) {
        await prisma.qRCode.create({
          data: {
            code: generateCode(session.id, stage),
            stage,
            sessionId: session.id,
          },
        });
      }
    }
  }

  // Houses & Roles
  for (const h of HOUSES) {
    const house = await prisma.house.upsert({
      where: { name: h.name },
      update: {},
      create: { name: h.name },
    });
    for (const roleName of h.roles) {
      await prisma.role.upsert({
        where: { houseId_name: { houseId: house.id, name: roleName } },
        update: {},
        create: { houseId: house.id, name: roleName },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
