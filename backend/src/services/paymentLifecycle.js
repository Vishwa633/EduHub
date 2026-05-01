import BookingRequest from "../models/BookingRequest.js";
import InAppNotification from "../models/InAppNotification.js";
import Payment from "../models/Payment.js";
import PaymentActionLog from "../models/PaymentActionLog.js";
import User from "../models/User.js";

const AUTO_RELEASE_HOURS = Number.parseInt(process.env.PAYMENT_AUTO_RELEASE_HOURS || "48", 10);
const REMINDER_HOURS = Number.parseInt(process.env.PAYMENT_REMINDER_HOURS || "12", 10);
const FINAL_WARNING_HOURS = Number.parseInt(process.env.PAYMENT_FINAL_WARNING_HOURS || "4", 10);

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildReleaseDeadline = (fromDate = new Date()) => new Date(fromDate.getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000);

const pushNotification = async ({ userId, bookingId, paymentId, type, title, message, level }) => {
  await InAppNotification.create({
    user: userId,
    booking: bookingId || null,
    payment: paymentId || null,
    type,
    title,
    message,
    level,
    deliveredAt: new Date(),
  });

  // Placeholder push pipeline. Hook your provider (FCM/APNS/Expo Push) here.
  console.log("[PUSH_SIMULATION]", { userId: String(userId), title, message });
};

const writeLog = async ({ paymentId, sessionId, actor, actorRole, action, details }) => {
  await PaymentActionLog.create({
    payment: paymentId,
    sessionId,
    actor: actor || null,
    actorRole,
    action,
    details: details || {},
  });
};

export const createEscrowPaymentForBooking = async ({ booking, actorId }) => {
  const existing = await Payment.findOne({ sessionId: booking._id });
  if (existing) {
    return existing;
  }

  const payment = await Payment.create({
    sessionId: booking._id,
    amount: Number(booking.price || 0),
    status: "pending",
    autoReleaseAt: buildReleaseDeadline(new Date()),
  });

  booking.status = "funds_held";
  await booking.save();

  await writeLog({
    paymentId: payment._id,
    sessionId: booking._id,
    actor: actorId,
    actorRole: "student",
    action: "payment_held_in_escrow",
    details: {
      amount: payment.amount,
      autoReleaseAt: payment.autoReleaseAt,
    },
  });

  return payment;
};

export const markTutorCompleted = async ({ booking, payment, tutorId }) => {
  if (payment.status !== "pending") {
    return payment;
  }

  payment.tutorConfirmed = true;
  await payment.save();

  booking.status = "completed_by_tutor";
  booking.respondedAt = new Date();
  await booking.save();

  await writeLog({
    paymentId: payment._id,
    sessionId: booking._id,
    actor: tutorId,
    actorRole: "tutor",
    action: "tutor_marked_session_completed",
  });

  await pushNotification({
    userId: booking.student,
    bookingId: booking._id,
    paymentId: payment._id,
    type: "session_completed",
    title: "Session completed. Please confirm.",
    message: "Tutor marked this session as completed. Confirm or report a problem.",
    level: "info",
  });

  // Notify Admins
  const admins = await User.find({ role: "admin" }).select("_id").lean();
  if (admins.length) {
    await Promise.all(
      admins.map((admin) =>
        pushNotification({
          userId: admin._id,
          bookingId: booking._id,
          paymentId: payment._id,
          type: "system",
          title: "Payment release required",
          message: `Tutor ${booking.tutorName} completed session for ${booking.studentName}. Please release the payment.`,
          level: "info",
        })
      )
    );
  }

  return payment;
};

export const releasePayment = async ({ booking, payment, actorRole, actorId, reason }) => {
  if (payment.status !== "pending") {
    return payment;
  }

  payment.status = "released";
  payment.releasedAt = new Date();
  await payment.save();

  booking.status = "released";
  await booking.save();

  await writeLog({
    paymentId: payment._id,
    sessionId: booking._id,
    actor: actorId,
    actorRole,
    action: "payment_released_to_tutor",
    details: { reason: reason || "manual_release" },
  });

  await pushNotification({
    userId: booking.student,
    bookingId: booking._id,
    paymentId: payment._id,
    type: "system",
    title: "Payment released",
    message: reason === "auto_release" ? "Payment was auto-released to the tutor." : "Payment was released to the tutor.",
    level: "info",
  });

  await pushNotification({
    userId: booking.tutor,
    bookingId: booking._id,
    paymentId: payment._id,
    type: "system",
    title: "Payout completed",
    message: "Held payment has been released to your wallet balance.",
    level: "info",
  });

  return payment;
};

export const movePaymentToDispute = async ({ booking, payment, actorId, reason }) => {
  payment.status = "disputed";
  payment.disputedAt = new Date();
  await payment.save();

  booking.status = "disputed";
  booking.tutorMessage = String(reason || "").trim();
  await booking.save();

  await writeLog({
    paymentId: payment._id,
    sessionId: booking._id,
    actor: actorId,
    actorRole: "student",
    action: "payment_disputed",
    details: { reason: String(reason || "").trim() },
  });

  const admins = await User.find({ role: "admin" }).select("_id").lean();
  const tutorBookings = await BookingRequest.find({ tutor: booking.tutor }).select("_id").lean();
  const tutorBookingIds = tutorBookings.map((item) => item._id);
  const tutorDisputeCount = tutorBookingIds.length
    ? await Payment.countDocuments({
        sessionId: { $in: tutorBookingIds },
        status: "disputed",
      })
    : 0;

  if (admins.length) {
    await Promise.all(
      admins.map((admin) =>
        pushNotification({
          userId: admin._id,
          bookingId: booking._id,
          paymentId: payment._id,
          type: "dispute",
          title: "New payment dispute",
          message: `Session ${booking.subject} has been disputed by the student.`,
          level: "critical",
        })
      )
    );

    if (tutorDisputeCount >= 3) {
      await Promise.all(
        admins.map((admin) =>
          pushNotification({
            userId: admin._id,
            bookingId: booking._id,
            paymentId: payment._id,
            type: "system",
            title: "Tutor dispute risk flag",
            message: `Tutor ${booking.tutorName || "Unknown"} has ${tutorDisputeCount} disputed sessions.`,
            level: "warning",
          })
        )
      );
    }
  }

  return payment;
};

export const buildPaymentSnapshot = (payment) => {
  if (!payment) {
    return null;
  }

  return {
    id: payment._id,
    sessionId: payment.sessionId,
    amount: payment.amount,
    status: payment.status,
    studentConfirmed: payment.studentConfirmed,
    tutorConfirmed: payment.tutorConfirmed,
    createdAt: payment.createdAt,
    autoReleaseAt: payment.autoReleaseAt,
    releasedAt: payment.releasedAt,
    disputedAt: payment.disputedAt,
    refundedAt: payment.refundedAt,
  };
};

const maybeCreateReminder = async ({ booking, payment, now }) => {
  if (!payment.tutorConfirmed || payment.studentConfirmed || payment.status !== "pending") {
    return;
  }

  const autoReleaseAt = toDate(payment.autoReleaseAt);
  if (!autoReleaseAt) {
    return;
  }

  const msToRelease = autoReleaseAt.getTime() - now.getTime();
  const reminderThreshold = (AUTO_RELEASE_HOURS - REMINDER_HOURS) * 60 * 60 * 1000;
  const finalThreshold = FINAL_WARNING_HOURS * 60 * 60 * 1000;

  if (msToRelease <= reminderThreshold && !payment.lastReminderAt) {
    payment.lastReminderAt = now;
    await payment.save();

    await pushNotification({
      userId: booking.student,
      bookingId: booking._id,
      paymentId: payment._id,
      type: "reminder",
      title: "Reminder: You have not confirmed your session.",
      message: "Please confirm completion or report a problem to protect your payment.",
      level: "warning",
    });

    await writeLog({
      paymentId: payment._id,
      sessionId: booking._id,
      actor: null,
      actorRole: "system",
      action: "student_confirmation_reminder_sent",
    });
  }

  if (msToRelease <= finalThreshold && !payment.finalWarningAt) {
    payment.finalWarningAt = now;
    await payment.save();

    await pushNotification({
      userId: booking.student,
      bookingId: booking._id,
      paymentId: payment._id,
      type: "final_warning",
      title: "Final warning: Payment will be auto-released soon.",
      message: "Confirm now if there is any issue before auto-release.",
      level: "critical",
    });

    await writeLog({
      paymentId: payment._id,
      sessionId: booking._id,
      actor: null,
      actorRole: "system",
      action: "final_auto_release_warning_sent",
    });
  }
};

export const runPaymentAutomation = async () => {
  const now = new Date();
  const pendingPayments = await Payment.find({ status: "pending" }).lean();

  for (const pending of pendingPayments) {
    const booking = await BookingRequest.findById(pending.sessionId);
    if (!booking) {
      continue;
    }

    const payment = await Payment.findById(pending._id);
    if (!payment) {
      continue;
    }

    await maybeCreateReminder({ booking, payment, now });

    if (
      payment.tutorConfirmed &&
      !payment.studentConfirmed &&
      payment.status === "pending" &&
      payment.autoReleaseAt &&
      new Date(payment.autoReleaseAt).getTime() <= now.getTime()
    ) {
      await releasePayment({
        booking,
        payment,
        actorRole: "system",
        actorId: null,
        reason: "auto_release",
      });
    }
  }
};
