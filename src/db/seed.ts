import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/password";
import { db } from "./index";
import { persons, rooms, users } from "./schema";

// Configurable via env so a fresh deployment can set its own owner; the
// defaults are deliberately generic — change the password after first login.
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
const OWNER_NAME = process.env.SEED_OWNER_NAME ?? "Owner";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "changeme";

async function main() {
  let owner = await db.query.users.findFirst({
    where: eq(users.email, OWNER_EMAIL),
  });

  if (owner) {
    console.log(`Seed: owner ${OWNER_EMAIL} already exists — skipping.`);
  } else {
    const passwordHash = await hashPassword(OWNER_PASSWORD);
    const [created] = await db
      .insert(users)
      .values({
        name: OWNER_NAME,
        email: OWNER_EMAIL,
        passwordHash,
        role: "owner",
      })
      .returning();
    owner = created;
    console.log(
      `Seed: created owner ${OWNER_EMAIL} (password: ${OWNER_PASSWORD})`,
    );
  }

  // A person linked to the owner account, so captured books have a default owner.
  const existingPerson = await db.query.persons.findFirst({
    where: eq(persons.userId, owner.id),
  });
  if (!existingPerson) {
    await db.insert(persons).values({ name: OWNER_NAME, userId: owner.id });
    console.log(`Seed: created person '${OWNER_NAME}' linked to owner.`);
  } else {
    console.log("Seed: linked person already present — skipping.");
  }

  const roomCount = (await db.select().from(rooms)).length;
  if (roomCount === 0) {
    await db.insert(rooms).values({ name: "Wohnzimmer", sortIndex: 0 });
    console.log("Seed: created room 'Wohnzimmer'.");
  } else {
    console.log("Seed: rooms already present — skipping.");
  }

  console.log("Seed done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
