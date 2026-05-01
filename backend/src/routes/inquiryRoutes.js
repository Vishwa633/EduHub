import express from "express";
import mongoose from "mongoose";
import protectRoute from "../middleware/auth.middleware.js";
import Inquiry from "../models/Inquiry.js";
import InAppNotification from "../models/InAppNotification.js";
import User from "../models/User.js";

const router = express.Router();

const validObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// --- STUDENT ROUTES ---

// Create an inquiry
router.post("/", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can create inquiries" });
    }

    const { category, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    const inquiry = await Inquiry.create({
      student: req.user._id,
      studentName: req.user.username,
      category: category || "other",
      subject: subject.trim(),
      message: message.trim(),
    });

    // Notify admins
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (admins.length) {
      await Promise.all(
        admins.map((admin) =>
          InAppNotification.create({
            user: admin._id,
            inquiry: inquiry._id,
            type: "inquiry",
            title: "New Student Inquiry",
            message: `A student has submitted a new inquiry: ${subject}`,
            level: "info",
            deliveredAt: new Date(),
          })
        )
      );
    }

    return res.status(201).json(inquiry);
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Get my inquiries
router.get("/my", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied" });
    }

    const inquiries = await Inquiry.find({ student: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json(inquiries);
  } catch (error) {
    console.error("Error fetching my inquiries:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// --- ADMIN ROUTES ---

// Get all inquiries (Admin)
router.get("/admin/all", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const inquiries = await Inquiry.find()
      .sort({ status: 1, updatedAt: -1 })
      .populate("student", "username email profileImage")
      .lean();

    return res.status(200).json(inquiries);
  } catch (error) {
    console.error("Error fetching all inquiries:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Reply to an inquiry
router.patch("/:id/reply", protectRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;

    if (!validObjectId(id)) {
      return res.status(400).json({ message: "Invalid inquiry ID" });
    }

    if (!message) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    // Check authorization: only admin or the student who created it
    const isAdmin = req.user.role === "admin";
    const isOwner = String(inquiry.student) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not authorized to reply" });
    }

    inquiry.replies.push({
      sender: req.user._id,
      senderRole: isAdmin ? "admin" : "student",
      message: message.trim(),
    });

    if (status && ["open", "resolved"].includes(status)) {
      inquiry.status = status;
    }

    await inquiry.save();

    // If admin replies, notify the student
    if (isAdmin) {
      await InAppNotification.create({
        user: inquiry.student,
        inquiry: inquiry._id,
        type: "inquiry",
        title: "Admin replied to your inquiry",
        message: `Admin has replied to your inquiry: ${inquiry.subject}`,
        level: "info",
        deliveredAt: new Date(),
      });
    } else {
      // If student replies, notify admins
      const admins = await User.find({ role: "admin" }).select("_id").lean();
      if (admins.length) {
          await Promise.all(
            admins.map((admin) =>
              InAppNotification.create({
                user: admin._id,
                inquiry: inquiry._id,
                type: "inquiry",
                title: "Inquiry Follow-up",
                message: `Student ${req.user.username} replied to an inquiry.`,
                level: "info",
                deliveredAt: new Date(),
              })
            )
          );
      }
    }

    return res.status(200).json(inquiry);
  } catch (error) {
    console.error("Error replying to inquiry:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Resolve an inquiry
router.patch("/:id/resolve", protectRoute, async (req, res) => {
    try {
      const { id } = req.params;
      if (!validObjectId(id)) {
        return res.status(400).json({ message: "Invalid inquiry ID" });
      }
  
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
  
      const inquiry = await Inquiry.findById(id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
  
      inquiry.status = "resolved";
      await inquiry.save();
  
      await InAppNotification.create({
        user: inquiry.student,
        inquiry: inquiry._id,
        type: "inquiry",
        title: "Inquiry Resolved",
        message: `Your inquiry about ${inquiry.subject} has been marked as resolved by Admin.`,
        level: "info",
        deliveredAt: new Date(),
      });
  
      return res.status(200).json(inquiry);
    } catch (error) {
      console.error("Error resolving inquiry:", error);
      return res.status(500).json({ message: "Internal Server error" });
    }
  });

export default router;
