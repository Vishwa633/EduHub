import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "released", "disputed", "refunded"],
      default: "pending",
      index: true,
    },
    studentConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    tutorConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    autoReleaseAt: {
      type: Date,
      index: true,
    },
    releasedAt: {
      type: Date,
    },
    disputedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    lastReminderAt: {
      type: Date,
    },
    finalWarningAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
