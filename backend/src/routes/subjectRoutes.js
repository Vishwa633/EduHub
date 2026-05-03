import express from "express";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getPublicSubjects,
} from "../controllers/subjectController.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

router.route("/public")
  .get(getPublicSubjects);

router.route("/")
  .get(protectRoute, adminOnly, getSubjects)
  .post(protectRoute, adminOnly, createSubject);

router.route("/:id")
  .put(protectRoute, adminOnly, updateSubject)
  .delete(protectRoute, adminOnly, deleteSubject);

export default router;
