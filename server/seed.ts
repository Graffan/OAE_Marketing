/**
 * Seed script — run once: npm run db:seed
 * Creates the default admin user and app settings for OAE Marketing.
 */
import bcrypt from "bcrypt";
import { db } from "./db.js";
import { users, appSettings } from "@shared/schema.js";
import { eq } from "drizzle-orm";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "oaeadmin2024";

async function seed() {
  console.log("Seeding database...");

  // Admin user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, DEFAULT_USERNAME))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
      console.log("Updated admin user role to \"admin\".");
    } else {
      console.log("Admin user already exists — skipping user seed.");
    }
  } else {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const [user] = await db
      .insert(users)
      .values({
        username: DEFAULT_USERNAME,
        email: "admin@otheranimal.app",
        password: passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
      })
      .returning();

    console.log(`Admin user created: ${user.username} (id: ${user.id})`);
    console.log(`Login: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);
    console.log("Change the password after first login!");
  }

  // App settings singleton
  const [existingSettings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);

  if (!existingSettings) {
    await db.insert(appSettings).values({
      id: 1,
      companyName: "Other Animal Entertainment",
      appTitle: "OAE Marketing",
      logoUrl: null,
      accentColor: "#e11d48",
    });
    console.log("Default app settings created.");
  } else {
    console.log("App settings already exist — skipping settings seed.");
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
