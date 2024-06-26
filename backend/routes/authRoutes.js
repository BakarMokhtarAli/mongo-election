import express from "express";
import {
  forgotPassword,
  resetPassword,
  signIn,
  signUp,
  verifyCode,
  protect,
  updatePassword,
  deleteMe,
  updateMe,
} from "../controllers/authController.js";
import upload from "../config/multer.js";
const router = express.Router();

router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

router.route("/signup").post(upload.single("photo"), signUp);
router.route("/signin").post(signIn);
router.route("/verify-code").post(verifyCode);

router.route("/update-password").patch(protect, updatePassword);
router.route("/update-me").patch(protect, upload.single("photo"), updateMe);
router.route("/delete-me").patch(protect, deleteMe);
export default router;
