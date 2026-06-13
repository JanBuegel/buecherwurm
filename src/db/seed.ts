import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/password";
import { db } from "./index";
import { shelves, users } from "./schema";

const OWNER_EMAIL = "jab@tickettoaster.de";
const OWNER_NAME = "Jan";
const OWNER_PASSWORD = "buecherwurm"; // change after first login

async function main() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, OWNER_EMAIL),
  });

  if (existing) {
    console.log(`Seed: owner ${OWNER_EMAIL} already exists — skipping.`);
  } else {
    const passwordHash = await hashPassword(OWNER_PASSWORD);
    await db.insert(users).values({
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      passwordHash,
      role: "owner",
    });
    console.log(
      `Seed: created owner ${OWNER_EMAIL} (password: ${OWNER_PASSWORD})`,
    );
  }

  const shelfCount = (await db.select().from(shelves)).length;
  if (shelfCount === 0) {
    await db.insert(shelves).values({
      name: "Wohnzimmerregal",
      room: "Wohnzimmer",
      sortIndex: 0,
    });
    console.log("Seed: created shelf 'Wohnzimmerregal'.");
  } else {
    console.log("Seed: shelves already present — skipping.");
  }

  console.log("Seed done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
