import express from "express";
import mongoose from "mongoose";
import BookingRequest from "../models/BookingRequest.js";
import InAppNotification from "../models/InAppNotification.js";
import Payment from "../models/Payment.js";
import PaymentActionLog from "../models/PaymentActionLog.js";
import protectRoute from "../middleware/auth.middleware.js";
import {
  buildPaymentSnapshot,
  createEscrowPaymentForBooking,
  markTutorCompleted,
  movePaymentToDispute,
  releasePayment,
} from "../services/paymentLifecycle.js";

const router = express.Router();

const validObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const requireBookingAccess = (booking, userId) =>
  String(booking.student) === String(userId) ||
  String(booking.tutor) === String(userId);

router.get("/history", protectRoute, async (req, res) => {
  try {
    let query = {};
    const role = String(req.user.role || "").toLowerCase();

    if (role === "student") {
      // Find all bookings for this student
      const bookings = await BookingRequest.find({
        student: req.user._id,
      }).select("_id");
      const bookingIds = bookings.map((b) => b._id);
      query = { sessionId: { $in: bookingIds } };
    } else if (role === "tutor") {
      // Find all bookings for this tutor
      const bookings = await BookingRequest.find({
        tutor: req.user._id,
      }).select("_id");
      const bookingIds = bookings.map((b) => b._id);
      query = { sessionId: { $in: bookingIds } };
    } else if (role === "admin") {
      // Admin sees everything
      query = {};
    } else {
      return res
        .status(403)
        .json({ message: "Invalid role for payment history" });
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "sessionId",
        select:
          "subject sessionDate sessionTime price priceType student tutor studentName tutorName status",
        populate: [
          { path: "student", select: "username email profileImage" },
          {
            path: "tutor",
            select: "username email profileImage tutorProfile.fullName",
          },
        ],
      })
      .lean();

    const result = payments.map((p) => ({
      ...buildPaymentSnapshot(p),
      session: p.sessionId,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error loading payment history:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

// ─── STATIC / PREFIXED ROUTES (must come BEFORE /:bookingId param routes) ───

router.get("/alerts/me", protectRoute, async (req, res) => {
  try {
    const alerts = await InAppNotification.find({ user: req.user._id })
      .sort({ deliveredAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(alerts);
  } catch (error) {
    console.error("Error loading alerts:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/alerts/:id/read", protectRoute, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid alert id" });
    }

    const alert = await InAppNotification.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (String(alert.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    alert.isRead = true;
    await alert.save();

    return res.status(200).json({ message: "Alert marked as read" });
  } catch (error) {
    console.error("Error marking alert read:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.delete("/alerts/me", protectRoute, async (req, res) => {
  try {
    const result = await InAppNotification.deleteMany({ user: req.user._id });
    return res.status(200).json({
      message: "Alerts cleared successfully",
      deletedCount: Number(result?.deletedCount || 0),
    });
  } catch (error) {
    console.error("Error clearing alerts:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/admin/disputes/list", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view disputes" });
    }

    const disputes = await Payment.find({ status: "disputed" })
      .sort({ updatedAt: -1 })
      .populate({
        path: "sessionId",
        populate: [
          { path: "student", select: "username email" },
          { path: "tutor", select: "username email tutorProfile.fullName" },
        ],
      })
      .lean();

    const paymentIds = disputes.map((payment) => payment._id);
    const logs = await PaymentActionLog.find({ payment: { $in: paymentIds } })
      .sort({ createdAt: -1 })
      .lean();

    const logsByPayment = new Map();
    for (const log of logs) {
      const key = String(log.payment);
      const existing = logsByPayment.get(key) || [];
      existing.push(log);
      logsByPayment.set(key, existing);
    }

    const result = disputes.map((payment) => ({
      ...buildPaymentSnapshot(payment),
      session: payment.sessionId
        ? {
            id: payment.sessionId._id,
            subject: payment.sessionId.subject,
            sessionDate: payment.sessionId.sessionDate,
            sessionTime: payment.sessionId.sessionTime,
            sessionMode: payment.sessionId.sessionMode,
            tutorMessage: payment.sessionId.tutorMessage,
            student: payment.sessionId.student,
            tutor: payment.sessionId.tutor,
          }
        : null,
      actionLogs: logsByPayment.get(String(payment._id)) || [],
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error loading disputes:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/admin/:paymentId/refund", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can refund disputed payments" });
    }

    const { paymentId } = req.params;
    if (!validObjectId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "disputed") {
      return res
        .status(400)
        .json({ message: "Only disputed payments can be refunded" });
    }

    const booking = await BookingRequest.findById(payment.sessionId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    payment.status = "refunded";
    payment.refundedAt = new Date();
    await payment.save();

    booking.status = "refunded";
    await booking.save();

    await PaymentActionLog.create({
      payment: payment._id,
      sessionId: booking._id,
      actor: req.user._id,
      actorRole: "admin",
      action: "admin_refunded_student",
      details: {},
    });

    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error refunding payment:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/admin/:paymentId/release", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can release disputed payments" });
    }

    const { paymentId } = req.params;
    if (!validObjectId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "disputed") {
      return res
        .status(400)
        .json({ message: "Only disputed payments can be released" });
    }

    const booking = await BookingRequest.findById(payment.sessionId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    payment.status = "pending";
    await payment.save();

    await releasePayment({
      booking,
      payment,
      actorRole: "admin",
      actorId: req.user._id,
      reason: "admin_resolved_dispute",
    });

    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error releasing disputed payment:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

// ─── PARAMETERIZED ROUTES (/:bookingId) ─────────────────────────────────────

router.post("/:bookingId/hold", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can initiate payment hold" });
    }

    const { bookingId } = req.params;
    if (!validObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.student) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this booking" });
    }

    if (
      !["accepted", "funds_held", "completed_by_tutor"].includes(
        String(booking.status || "").toLowerCase(),
      )
    ) {
      return res
        .status(400)
        .json({ message: "Payment can only be held for accepted sessions" });
    }

    const existingPayment = await Payment.findOne({ sessionId: booking._id })
      .select("_id")
      .lean();
    const payment = await createEscrowPaymentForBooking({
      booking,
      actorId: req.user._id,
    });

    if (!existingPayment) {
      try {
        await InAppNotification.create({
          user: booking.tutor,
          booking: booking._id,
          payment: payment._id,
          type: "system",
          title: "Student completed payment hold",
          message: `${booking.studentName || "Student"} secured the session payment for ${booking.subject || "your session"}.`,
          level: "info",
          deliveredAt: new Date(),
        });
      } catch (notificationError) {
        console.error(
          "Error creating tutor payment-hold notification:",
          notificationError,
        );
      }
    }

    return res.status(201).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error creating held payment:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/:bookingId", protectRoute, async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!validObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      !requireBookingAccess(booking, req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const payment = await Payment.findOne({ sessionId: booking._id }).lean();
    return res.status(200).json({
      bookingId: booking._id,
      bookingStatus: booking.status,
      payment: buildPaymentSnapshot(payment),
    });
  } catch (error) {
    console.error("Error loading payment:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/:bookingId/tutor-complete", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res
        .status(403)
        .json({ message: "Only tutors can mark sessions as completed" });
    }

    const { bookingId } = req.params;
    if (!validObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.tutor) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this booking" });
    }

    const sessionStart = new Date(booking.sessionDate);
    if (sessionStart.getTime() > Date.now()) {
      return res
        .status(400)
        .json({ message: "Cannot mark completion before the session date" });
    }

    const payment = await Payment.findOne({ sessionId: booking._id });
    if (!payment || payment.status !== "pending") {
      return res
        .status(400)
        .json({
          message: "A pending held payment is required before completion",
        });
    }

    await markTutorCompleted({ booking, payment, tutorId: req.user._id });
    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error marking tutor completion:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/:bookingId/student-confirm", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can confirm completion" });
    }

    const { bookingId } = req.params;
    if (!validObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.student) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this booking" });
    }

    const payment = await Payment.findOne({ sessionId: booking._id });
    if (!payment || payment.status !== "pending") {
      return res.status(400).json({ message: "Pending payment not found" });
    }

    payment.studentConfirmed = true;
    await payment.save();

    await PaymentActionLog.create({
      payment: payment._id,
      sessionId: booking._id,
      actor: req.user._id,
      actorRole: "student",
      action: "student_confirmed_session",
      details: {},
    });

    if (payment.tutorConfirmed) {
      await releasePayment({
        booking,
        payment,
        actorRole: "student",
        actorId: req.user._id,
        reason: "student_confirmed",
      });
    }

    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error confirming session:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/:bookingId/report-problem", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can report problems" });
    }

    const { bookingId } = req.params;
    const reason = String(req.body?.reason || "").trim();
    if (!validObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Problem reason is required" });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.student) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this booking" });
    }

    const payment = await Payment.findOne({ sessionId: booking._id });
    if (!payment || payment.status !== "pending") {
      return res.status(400).json({ message: "Pending payment not found" });
    }

    await movePaymentToDispute({
      booking,
      payment,
      actorId: req.user._id,
      reason,
    });
    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error reporting payment problem:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/admin/disputes/list", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view disputes" });
    }

    const disputes = await Payment.find({ status: "disputed" })
      .sort({ updatedAt: -1 })
      .populate({
        path: "sessionId",
        populate: [
          { path: "student", select: "username email" },
          { path: "tutor", select: "username email tutorProfile.fullName" },
        ],
      })
      .lean();

    const paymentIds = disputes.map((payment) => payment._id);
    const logs = await PaymentActionLog.find({ payment: { $in: paymentIds } })
      .sort({ createdAt: -1 })
      .lean();

    const logsByPayment = new Map();
    for (const log of logs) {
      const key = String(log.payment);
      const existing = logsByPayment.get(key) || [];
      existing.push(log);
      logsByPayment.set(key, existing);
    }

    const result = disputes.map((payment) => ({
      ...buildPaymentSnapshot(payment),
      session: payment.sessionId
        ? {
            id: payment.sessionId._id,
            subject: payment.sessionId.subject,
            sessionDate: payment.sessionId.sessionDate,
            sessionTime: payment.sessionId.sessionTime,
            sessionMode: payment.sessionId.sessionMode,
            tutorMessage: payment.sessionId.tutorMessage,
            student: payment.sessionId.student,
            tutor: payment.sessionId.tutor,
          }
        : null,
      actionLogs: logsByPayment.get(String(payment._id)) || [],
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error loading disputes:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/admin/:paymentId/refund", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can refund disputed payments" });
    }

    const { paymentId } = req.params;
    if (!validObjectId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "disputed") {
      return res
        .status(400)
        .json({ message: "Only disputed payments can be refunded" });
    }

    const booking = await BookingRequest.findById(payment.sessionId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    payment.status = "refunded";
    payment.refundedAt = new Date();
    await payment.save();

    booking.status = "refunded";
    await booking.save();

    await PaymentActionLog.create({
      payment: payment._id,
      sessionId: booking._id,
      actor: req.user._id,
      actorRole: "admin",
      action: "admin_refunded_student",
      details: {},
    });

    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error refunding payment:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/admin/:paymentId/release", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can release disputed payments" });
    }

    const { paymentId } = req.params;
    if (!validObjectId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const canRelease =
      payment.status === "disputed" ||
      (payment.status === "pending" && payment.tutorConfirmed === true);

    if (!canRelease) {
      return res
        .status(400)
        .json({
          message:
            "Payment can only be released if disputed or completed by tutor",
        });
    }

    const booking = await BookingRequest.findById(payment.sessionId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    payment.status = "pending";
    await payment.save();

    await releasePayment({
      booking,
      payment,
      actorRole: "admin",
      actorId: req.user._id,
      reason: "admin_resolved_dispute",
    });

    return res.status(200).json(buildPaymentSnapshot(payment));
  } catch (error) {
    console.error("Error releasing disputed payment:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/alerts/me", protectRoute, async (req, res) => {
  try {
    const alerts = await InAppNotification.find({ user: req.user._id })
      .sort({ deliveredAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(alerts);
  } catch (error) {
    console.error("Error loading alerts:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.patch("/alerts/:id/read", protectRoute, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid alert id" });
    }

    const alert = await InAppNotification.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (String(alert.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    alert.isRead = true;
    await alert.save();

    return res.status(200).json({ message: "Alert marked as read" });
  } catch (error) {
    console.error("Error marking alert read:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.delete("/alerts/me", protectRoute, async (req, res) => {
  try {
    const result = await InAppNotification.deleteMany({ user: req.user._id });
    return res.status(200).json({
      message: "Alerts cleared successfully",
      deletedCount: Number(result?.deletedCount || 0),
    });
  } catch (error) {
    console.error("Error clearing alerts:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/:bookingId/logs", protectRoute, async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!validObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      !requireBookingAccess(booking, req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const payment = await Payment.findOne({ sessionId: booking._id });
    if (!payment) {
      return res.status(200).json([]);
    }

    const logs = await PaymentActionLog.find({ payment: payment._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error loading payment logs:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

router.get("/admin/dashboard-stats", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can view dashboard stats" });
    }

    const [tutorCount, studentCount, activeSessions, revenueData] =
      await Promise.all([
        mongoose.model("User").countDocuments({ role: "tutor" }),
        mongoose.model("User").countDocuments({ role: "student" }),
        BookingRequest.countDocuments({
          status: { $in: ["funds_held", "completed_by_tutor", "disputed"] },
        }),
        Payment.aggregate([
          { $match: { status: "released" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    return res.status(200).json({
      tutors: tutorCount,
      students: studentCount,
      activeSessions,
      revenue: totalRevenue,
    });
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
    return res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
});

export default router;
