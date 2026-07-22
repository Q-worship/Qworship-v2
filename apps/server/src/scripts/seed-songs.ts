// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "../modules/auth/auth.model.js";
import { Organization } from "../modules/organization/organization.model.js";
import { Song } from "../modules/songs/song.model";

dotenv.config();

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is required");
    console.log("Connecting to configured MongoDB database");
    await mongoose.connect(uri);

    // 1. Find or create User
    let user = await User.findOne({ email: "admin@example.com" });
    if (!user) {
      const seedPassword = process.env.SEED_ADMIN_PASSWORD;
      if (!seedPassword || seedPassword.length < 12) throw new Error("SEED_ADMIN_PASSWORD (minimum 12 characters) is required when creating the seed admin");
      console.log("Creating mock admin user...");
      user = await User.create({
        username: "admin_seed",
        email: "admin@example.com",
        password: await bcrypt.hash(seedPassword, 12),
        role: "superadmin",
        accountType: "free",
        isActive: true,
        emailVerified: true,
        onboardingStatus: "completed",
        trialStatus: "converted",
        subscriptionStatus: "active",
      });
    }

    // 2. Find or create Organization
    let org = await Organization.findOne({ ownerId: user._id });
    if (!org) {
      console.log("Creating mock organization...");
      org = await Organization.create({
        name: "Demo Church",
        subscriptionType: "free",
        subscriptionStatus: "active",
        ownerId: user._id,
      });
    }

    // 3. Clear existing songs for clean slate (optional but good for testing)
    await Song.deleteMany({
      title: { $in: ["Amazing Grace", "How Great Thou Art"] },
    });

    // 4. Create Songs bridging legacy fields and new schema
    console.log("Seeding songs...");

    await Song.create({
      title: "Amazing Grace",
      artist: "John Newton",
      lyrics:
        "[Verse 1]\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\n[Chorus]\nMy chains are gone, I've been set free\nMy God, my Savior has ransomed me",
      structure: ["V1", "C1"],
      ccliNumber: "4759662",
      tags: ["hymn", "grace", "classic"],
      sections: [
        {
          type: "verse",
          title: "Verse 1",
          content:
            "Amazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see",
          order: 1,
        },
        {
          type: "chorus",
          title: "Chorus",
          content:
            "My chains are gone, I've been set free\nMy God, my Savior has ransomed me",
          order: 2,
        },
      ],
      organizationId: org._id,
      createdBy: user._id,
    });

    await Song.create({
      title: "How Great Thou Art",
      artist: "Carl Boberg",
      lyrics:
        "[Verse 1]\nO Lord my God, When I in awesome wonder\nConsider all the worlds Thy Hands have made\n\n[Chorus]\nThen sings my soul, My Saviour God, to Thee\nHow great Thou art, How great Thou art",
      structure: ["V1", "C1"],
      ccliNumber: "14181",
      tags: ["worship", "god", "greatness"],
      sections: [
        {
          type: "verse",
          title: "Verse 1",
          content:
            "O Lord my God, When I in awesome wonder\nConsider all the worlds Thy Hands have made",
          order: 1,
        },
        {
          type: "chorus",
          title: "Chorus 1",
          content:
            "Then sings my soul, My Saviour God, to Thee\nHow great Thou art, How great Thou art",
          order: 2,
        },
      ],
      organizationId: org._id,
      createdBy: user._id,
    });

    console.log("✅ Successfully seeded Legacy Songs into new MongoDB Schema!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed DB:", err);
    process.exit(1);
  }
}

seed();
