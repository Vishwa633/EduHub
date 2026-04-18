import User from "../models/User.js";

const DEFAULT_ADMIN = {
  username: String(process.env.ADMIN_USERNAME || "").trim(),
  email: String(process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "",
  profileImage: String(process.env.ADMIN_PROFILE_IMAGE || "").trim(),
};

export const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ role: "admin" });

  if (!DEFAULT_ADMIN.username || !DEFAULT_ADMIN.email || !DEFAULT_ADMIN.password) {
    console.warn("Admin bootstrap skipped: ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set.");
    return {
      created: false,
      skipped: true,
      reason: "Missing admin environment variables",
    };
  }

  if (existingAdmin) {
    existingAdmin.username = DEFAULT_ADMIN.username;
    existingAdmin.email = DEFAULT_ADMIN.email;
    existingAdmin.profileImage = DEFAULT_ADMIN.profileImage || existingAdmin.profileImage;
    if (DEFAULT_ADMIN.password) {
      existingAdmin.password = DEFAULT_ADMIN.password;
    }
    existingAdmin.role = "admin";
    await existingAdmin.save();

    return {
      created: false,
      updated: true,
      username: existingAdmin.username,
      email: existingAdmin.email,
    };
  }

  const admin = new User({
    username: DEFAULT_ADMIN.username,
    email: DEFAULT_ADMIN.email,
    password: DEFAULT_ADMIN.password,
    profileImage: DEFAULT_ADMIN.profileImage,
    role: "admin",
  });

  await admin.save();

  return {
    created: true,
    username: admin.username,
    email: admin.email,
  };
};