import mongoose from "mongoose";

const bookingRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    tutorName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    priceType: {
      type: String,
      required: true,
      enum: ["per_hour", "per_session"],
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    sessionTime: {
      type: String,
      required: true,
      trim: true,
    },
    sessionMode: {
      type: String,
      enum: ["online", "in-person"],
      default: "online",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "paid", "funds_held", "completed_by_tutor", "disputed", "released", "refunded"],
      default: "pending",
    },
    tutorMessage: {
      type: String,
      default: "",
      trim: true,
    },
    respondedAt: {
      type: Date,
    },
    hiddenForStudent: {
      type: Boolean,
      default: false,
    },
    hiddenForTutor: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const BookingRequest = mongoose.model("BookingRequest", bookingRequestSchema);

export default BookingRequest;