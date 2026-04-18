// Run this script ONCE to drop the unique index on { tutor: 1, student: 1 } in the tutorratings collection.
// Usage: node dropTutorRatingIndex.js

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Example"; // <-- changed to your DB name

async function dropIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    const result = await mongoose.connection.db.collection("tutorratings").dropIndex({ tutor: 1, student: 1 });
    console.log("Index dropped:", result);
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log("Index not found or already dropped.");
    } else {
      console.error("Error dropping index:", err);
    }
  } finally {
    await mongoose.disconnect();
  }
}

dropIndex();
