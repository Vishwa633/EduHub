import express from "express";
import mongoose from "mongoose";
import BookingRequest from "../models/BookingRequest.js";
import InAppNotification from "../models/InAppNotification.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

const normalizeSessionMode = (value) => (String(value || "").trim().toLowerCase() === "in-person" ? "in-person" : "online");
const normalizePriceType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "per session" || normalized === "per_session") {
    return "per_session";
  }
  return "per_hour";
};

const attachPaymentSnapshots = async (bookings) => {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return bookings;
  }

  const bookingIds = bookings.map((booking) => booking._id);
  const payments = await Payment.find({ sessionId: { $in: bookingIds } })
    .select("_id sessionId amount status studentConfirmed tutorConfirmed createdAt autoReleaseAt releasedAt disputedAt refundedAt")
    .lean();

  const paymentMap = new Map(payments.map((payment) => [String(payment.sessionId), payment]));
  return bookings.map((booking) => ({
    ...booking,
    payment: paymentMap.get(String(booking._id)) || null,
  }));
};

router.post("/", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can create booking requests" });
    }

    const {
      tutorId,
      tutorName,
      subject,
      price,
      priceType,
      sessionDate,
      sessionTime,
      sessionMode,
      notes,
    } = req.body || {};

    if (!tutorId || !subject || price === undefined || !priceType || !sessionDate || !sessionTime) {
      return res.status(400).json({ message: "All booking fields are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor id" });
    }

    const tutor = await User.findOne({ _id: tutorId, role: "tutor", approvalStatus: { $ne: "pending" }, isActive: { $ne: false } }).select("_id username tutorProfile.fullName");
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found or not yet approved" });
    }

    const booking = await BookingRequest.create({
      student: req.user._id,
      tutor: tutor._id,
      studentName: req.user.username,
      tutorName: String(tutorName || tutor.tutorProfile?.fullName || tutor.username).trim(),
      subject: String(subject).trim(),
      price: Number(price),
      priceType: normalizePriceType(priceType),
      sessionDate: new Date(sessionDate),
      sessionTime: String(sessionTime).trim(),
      sessionMode: normalizeSessionMode(sessionMode),
      notes: String(notes || "").trim(),
      status: "pending",
    });

    await InAppNotification.create({
      user: tutor._id,
      booking: booking._id,
      type: "system",
      title: "New session booking request",
      message: `${req.user.username} booked a new session. Check your Sessions tab to accept or reject.`,
      level: "info",
      deliveredAt: new Date(),
    });

    const populatedBooking = await BookingRequest.findById(booking._id)
      .populate("student", "username profileImage role")
      .populate("tutor", "username profileImage tutorProfile.fullName tutorProfile.subject");

    return res.status(201).json(populatedBooking);
  } catch (error) {
    console.error("Error creating booking request:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/student", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view student notifications" });
    }

    const bookings = await BookingRequest.find({
      student: req.user._id,
      hiddenForStudent: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("tutor", "username profileImage tutorProfile.fullName tutorProfile.subject")
      .lean();

    return res.status(200).json(await attachPaymentSnapshots(bookings));
  } catch (error) {
    console.error("Error fetching student bookings:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/admin/sessions", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view all sessions" });
    }

    const limit = Math.min(Number.parseInt(req.query.limit || "50", 10) || 50, 100);
    const page = Math.max(Number.parseInt(req.query.page || "1", 10) || 1, 1);
    const skip = (page - 1) * limit;

    const bookings = await BookingRequest.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("student", "username email profileImage")
      .populate("tutor", "username email profileImage tutorProfile.fullName tutorProfile.subject tutorProfile.kyc")
      .lean();

    const withPayments = await attachPaymentSnapshots(bookings);
    const totalSessions = await BookingRequest.countDocuments({});

    return res.status(200).json({
      sessions: withPayments,
      totalSessions,
      page,
      limit,
      totalPages: Math.ceil(totalSessions / limit),
    });
  } catch (error) {
    console.error("Error fetching admin sessions:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/tutor", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can view booking notifications" });
    }

    const bookings = await BookingRequest.find({
      tutor: req.user._id,
      hiddenForTutor: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("student", "username profileImage")
      .lean();

    return res.status(200).json(await attachPaymentSnapshots(bookings));
  } catch (error) {
    console.error("Error fetching tutor bookings:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/:id", protectRoute, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(req.params.id)
      .populate("student", "username profileImage role")
      .populate("tutor", "username profileImage tutorProfile.fullName tutorProfile.subject")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isOwner = booking.student?._id?.toString() === req.user._id.toString() || booking.tutor?._id?.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    const isStudentOwner = booking.student?._id?.toString() === req.user._id.toString();
    const isTutorOwner = booking.tutor?._id?.toString() === req.user._id.toString();
    if ((isStudentOwner && booking.hiddenForStudent) || (isTutorOwner && booking.hiddenForTutor)) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const payment = await Payment.findOne({ sessionId: booking._id })
      .select("_id sessionId amount status studentConfirmed tutorConfirmed createdAt autoReleaseAt releasedAt disputedAt refundedAt")
      .lean();

    return res.status(200).json({
      ...booking,
      payment: payment || null,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/:id/status", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can update booking status" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const { status, tutorMessage } = req.body || {};
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const normalizedTutorMessage = typeof tutorMessage === "string" ? tutorMessage.trim() : "";

    if (!["accepted", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    const booking = await BookingRequest.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this booking" });
    }

    booking.status = normalizedStatus;
    booking.tutorMessage = normalizedStatus === "rejected" ? normalizedTutorMessage : booking.tutorMessage;
    booking.respondedAt = new Date();
    await booking.save();

    try {
      await InAppNotification.create({
        user: booking.student,
        booking: booking._id,
        type: "system",
        title: normalizedStatus === "accepted" ? "Booking accepted" : "Booking rejected",
        message:
          normalizedStatus === "accepted"
            ? `${booking.tutorName || "Tutor"} accepted your session request. Continue to payment to secure your booking.`
            : `${booking.tutorName || "Tutor"} rejected your session request${normalizedTutorMessage ? `. Reason: ${normalizedTutorMessage}` : "."}`,
        level: normalizedStatus === "accepted" ? "info" : "warning",
        deliveredAt: new Date(),
      });
    } catch (notificationError) {
      console.error("Error creating student booking status notification:", notificationError);
    }

    const updatedBooking = await BookingRequest.findById(booking._id)
      .populate("student", "username profileImage role")
      .populate("tutor", "username profileImage tutorProfile.fullName tutorProfile.subject");

    return res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking status:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isStudentOwner = booking.student.toString() === req.user._id.toString();
    const isTutorOwner = booking.tutor.toString() === req.user._id.toString();
    const isOwner = isStudentOwner || isTutorOwner;

    if (!isOwner) {
      return res.status(403).json({ message: "Not authorized to delete this notification" });
    }

    if (isStudentOwner) {
      const bookingStatus = String(booking.status || "").trim().toLowerCase();
      const payment = await Payment.findOne({ sessionId: booking._id }).select("status").lean();
      const paymentStatus = String(payment?.status || "").trim().toLowerCase();
      const isProtectedSession = ["accepted", "funds_held", "completed_by_tutor", "released"].includes(bookingStatus) || ["pending", "released"].includes(paymentStatus);

      booking.hiddenForStudent = true;
      booking.hiddenForTutor = true;

      try {
        await InAppNotification.create({
          user: booking.tutor,
          booking: booking._id,
          type: "system",
          title: isProtectedSession ? "Accepted session removed by student" : "Session cancelled by student",
          message: isProtectedSession
            ? `${booking.studentName || "Student"} removed an accepted session for ${booking.subject || "this session"}. Please review the session list.`
            : `${booking.studentName || "Student"} cancelled this session.`,
          level: isProtectedSession ? "critical" : "warning",
          deliveredAt: new Date(),
        });
      } catch (notificationError) {
        console.error("Error creating tutor cancellation notification:", notificationError);
      }
    }

    if (isTutorOwner) {
      booking.hiddenForTutor = true;
    }

    // Remove the document only after both sides hide it.
    if (booking.hiddenForStudent && booking.hiddenForTutor) {
      await BookingRequest.findByIdAndDelete(req.params.id);
    } else {
      await booking.save();
    }

    return res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking notification:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
});

export default router;