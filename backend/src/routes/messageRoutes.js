import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import BookingRequest from "../models/BookingRequest.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const router = express.Router();

// Get list of users the current user can chat with
router.get("/users", protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Filter for "attached" users: booking status must NOT be pending or rejected
    const filterStatus = ["accepted", "paid", "funds_held", "completed_by_tutor", "disputed", "released", "refunded"];

    let bookings;
    if (userRole === "student") {
      bookings = await BookingRequest.find({
        student: userId,
        status: { $in: filterStatus },
      }).populate("tutor", "username profileImage tutorProfile");
    } else if (userRole === "tutor") {
      bookings = await BookingRequest.find({
        tutor: userId,
        status: { $in: filterStatus },
      }).populate("student", "username profileImage");
    } else {
      // Admins might see everyone or restricted
      return res.status(200).json([]);
    }

    // Get unique users from bookings
    const connectedUsers = [];
    const seenIds = new Set();

    bookings.forEach((booking) => {
      const otherUser = userRole === "student" ? booking.tutor : booking.student;
      if (otherUser && !seenIds.has(otherUser._id.toString())) {
        connectedUsers.push(otherUser);
        seenIds.add(otherUser._id.toString());
      }
    });

    res.status(200).json(connectedUsers);
  } catch (error) {
    console.error("Error in get users for chat:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get chat history with a specific user
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Send a message
router.post("/send/:id", protectRoute, async (req, res) => {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
