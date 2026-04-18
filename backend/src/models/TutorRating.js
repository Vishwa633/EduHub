import mongoose from "mongoose";

const tutorRatingSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
  },
  { timestamps: true }
);



const TutorRating = mongoose.model("TutorRating", tutorRatingSchema);

export default TutorRating;