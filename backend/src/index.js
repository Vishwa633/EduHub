import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import tutorReviewsRoutes from "./routes/tutorReviews.js";
import materialRoutes from "./routes/materialRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";

import { startPaymentScheduler } from "./services/paymentScheduler.js";
import { ensureDefaultAdmin } from "./services/seedAdmin.js";
import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/tutorreviews", tutorReviewsRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/subjects", subjectRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await ensureDefaultAdmin();
    startPaymentScheduler();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(
        `✓ Accessible from Android Emulator at http://10.0.2.2:${PORT}`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
