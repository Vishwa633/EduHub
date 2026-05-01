import mongoose from "mongoose";

const materialPurchaseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

// Prevent duplicate purchases
materialPurchaseSchema.index({ student: 1, material: 1 }, { unique: true });

const MaterialPurchase = mongoose.model("MaterialPurchase", materialPurchaseSchema);

export default MaterialPurchase;
