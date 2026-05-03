import express from "express";
import multer from "multer";
import cloudinary from "../lib/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";
import Material from "../models/Material.js";
import MaterialPurchase from "../models/MaterialPurchase.js";
import Payment from "../models/Payment.js";

const router = express.Router();
const MATERIAL_TYPES = ["tute", "book", "quiz"];
const INVALID_PRICE_MESSAGE = "Price must be a valid non-negative number";

const parseMaterialPrice = (price) => {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : null;
};

// Multer config for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Upload material (Tutor only)
router.post("/upload", protectRoute, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can upload materials" });
    }

    const { title, description, subject, type, price } = req.body;
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedSubject = typeof subject === "string" ? subject.trim() : "";

    if (!normalizedTitle || !normalizedSubject || price === undefined || price === null || price === "") {
      return res.status(400).json({ message: "Title, subject, and price are required" });
    }
    
    // Enforce subject restriction
    const tutorSubject = req.user.tutorProfile?.subject;
    if (!tutorSubject || normalizedSubject.toLowerCase() !== String(tutorSubject).toLowerCase()) {
      return res.status(400).json({ 
        message: `You can only upload materials for your registered subject: ${tutorSubject || 'None'}` 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const numericPrice = parseMaterialPrice(price);
    if (numericPrice === null) {
      return res.status(400).json({ message: INVALID_PRICE_MESSAGE });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "learning_materials",
        public_id: `${Date.now()}-${req.file.originalname.replace(/\s/g, "_")}`,
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ message: "Failed to upload to Cloudinary" });
        }

        try {
          const material = await Material.create({
            tutor: req.user._id,
            title: normalizedTitle,
            description,
            subject: normalizedSubject,
            type: type || "tute",
            price: numericPrice,
            fileUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
          });

          return res.status(201).json(material);
        } catch (dbError) {
          console.error("Database error:", dbError);
          return res.status(500).json({ message: "Failed to save material to database" });
        }
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("Material upload error:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

import BookingRequest from "../models/BookingRequest.js";

// Get materials (Student view)
router.get("/", protectRoute, async (req, res) => {
  try {
    const { subject, type } = req.query;
    const filter = { isActive: true };
    if (subject) filter.subject = subject;
    if (type) filter.type = type;

    const materials = await Material.find(filter)
      .populate("tutor", "username profileImage tutorProfile")
      .sort({ createdAt: -1 })
      .lean();

    // If student, check access permissions
    if (req.user.role === "student") {
      // Session Payments (Paid and Held/Released) - SUBJECT WIDE ACCESS
      const sessionPayments = await Payment.find({
        student: req.user._id,
        status: { $in: ["pending", "released"] },
        type: "session",
      })
      .populate("sessionId") 
      .lean();

      // Create a set of unlocked subjects
      const unlockedSubjects = new Set(
        sessionPayments
          .filter(p => p.sessionId && p.sessionId.subject) 
          .map(p => p.sessionId.subject.toLowerCase())
      );

      const enrichedMaterials = materials.map((m) => {
        const isFree = m.price === 0;
        const isSubjectUnlocked = unlockedSubjects.has(String(m.subject).toLowerCase());

        return {
          ...m,
          isPurchased: isFree || isSubjectUnlocked,
          accessType: isFree ? "Free" : (isSubjectUnlocked ? "Subject Unlocked" : "Locked"),
        };
      });

      return res.status(200).json(enrichedMaterials);
    }

    return res.status(200).json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Get tutor uploads
router.get("/tutor-uploads", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const materials = await Material.find({ tutor: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(materials);
  } catch (error) {
    console.error("Error fetching tutor uploads:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Update material (Tutor only)
router.patch("/:id", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, price, type, isActive } = req.body;
    const material = await Material.findOne({ _id: req.params.id, tutor: req.user._id });

    if (!material) {
      return res.status(404).json({ message: "Material not found or unauthorized" });
    }

    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (price !== undefined) {
      const numericPrice = parseMaterialPrice(price);
      if (numericPrice === null) {
        return res.status(400).json({ message: INVALID_PRICE_MESSAGE });
      }
      material.price = numericPrice;
    }
    if (type !== undefined) {
      if (!MATERIAL_TYPES.includes(type)) {
        return res.status(400).json({ message: "Invalid material type" });
      }
      material.type = type;
    }
    if (isActive !== undefined) material.isActive = isActive;

    await material.save();
    return res.status(200).json(material);
  } catch (error) {
    console.error("Error updating material:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Delete material (Tutor only)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "tutor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const material = await Material.findOne({ _id: req.params.id, tutor: req.user._id });
    if (!material) {
      return res.status(404).json({ message: "Material not found or unauthorized" });
    }

    // Delete from Cloudinary
    if (material.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(material.cloudinaryPublicId, { resource_type: "raw" });
    }

    await Material.deleteOne({ _id: material._id });
    
    return res.status(200).json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

export default router;

