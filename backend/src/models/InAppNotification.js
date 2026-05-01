import mongoose from "mongoose";

const inAppNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      default: null,
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["session_completed", "reminder", "final_warning", "dispute", "system"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const InAppNotification = mongoose.model("InAppNotification", inAppNotificationSchema);

export default InAppNotification;
