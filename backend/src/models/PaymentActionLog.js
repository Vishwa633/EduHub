import mongoose from "mongoose";

const paymentActionLogSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["student", "tutor", "admin", "system"],
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const PaymentActionLog = mongoose.model("PaymentActionLog", paymentActionLogSchema);

export default PaymentActionLog;
