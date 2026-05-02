import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["tutor", "academic", "payment", "booking", "technical", "other"],
      default: "other",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },
    replies: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        senderRole: {
          type: String,
          enum: ["admin", "student"],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

const Inquiry = mongoose.model("Inquiry", inquirySchema);

export default Inquiry;
