import Subject from "../models/Subject.js";
import User from "../models/User.js";
import BookingRequest from "../models/BookingRequest.js";
import cloudinary from "../lib/cloudinary.js";

const uploadImageIfBase64 = async (image, folder) => {
    const value = String(image || "").trim();
    if (!value) {
        return "";
    }

    if (!value.startsWith("data:image")) {
        return value;
    }

    const uploadResponse = await cloudinary.uploader.upload(value, { folder });
    return uploadResponse.secure_url;
};

// @desc    Get all subjects with stats
// @route   GET /api/subjects
// @access  Private/Admin
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({}).sort({ createdAt: -1 }).lean();

    const subjectsWithStats = await Promise.all(
      subjects.map(async (subject) => {
        // Count tutors teaching this subject
        const tutorCount = await User.countDocuments({
          role: "tutor",
          "tutorProfile.subject": subject.name,
        });

        // Count students registered/booked for this subject
        const distinctStudents = await BookingRequest.distinct("student", {
          subject: subject.name,
        });
        const studentCount = distinctStudents.length;

        return {
          ...subject,
          tutorCount,
          studentCount,
        };
      })
    );

    res.json(subjectsWithStats);
  } catch (error) {
    console.error("Error in getSubjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create a subject
// @route   POST /api/subjects
// @access  Private/Admin
export const createSubject = async (req, res) => {
  try {
    const { name, description, isActive, image } = req.body;

    const subjectExists = await Subject.findOne({ name });
    if (subjectExists) {
      return res.status(400).json({ message: "Subject already exists" });
    }

    let imageUrl = "";
    if (image) {
      imageUrl = await uploadImageIfBase64(image, "bookworm/subjects");
    }

    const subject = await Subject.create({
      name,
      description,
      image: imageUrl,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(subject);
  } catch (error) {
    console.error("Error in createSubject:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update a subject
// @route   PUT /api/subjects/:id
// @access  Private/Admin
export const updateSubject = async (req, res) => {
  try {
    const { name, description, isActive, image } = req.body;

    const subject = await Subject.findById(req.params.id);

    if (subject) {
      if (image && image.startsWith("data:image")) {
        subject.image = await uploadImageIfBase64(image, "bookworm/subjects");
      } else if (image !== undefined) {
        subject.image = image;
      }

      subject.name = name || subject.name;
      subject.description = description !== undefined ? description : subject.description;
      subject.isActive = isActive !== undefined ? isActive : subject.isActive;

      const updatedSubject = await subject.save();
      res.json(updatedSubject);
    } else {
      res.status(404).json({ message: "Subject not found" });
    }
  } catch (error) {
    console.error("Error in updateSubject:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a subject
// @route   DELETE /api/subjects/:id
// @access  Private/Admin
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await subject.deleteOne();
    res.json({ message: "Subject removed" });
  } catch (error) {
    console.error("Error in deleteSubject:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all active subjects (Public access)
// @route   GET /api/subjects/public
// @access  Public
export const getPublicSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .select("name description image")
      .sort({ name: 1 });
      
    res.json(subjects);
  } catch (error) {
    console.error("Error in getPublicSubjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
