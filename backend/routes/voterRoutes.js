import express from "express";
import {
  createAdmin,
  createVoter,
  getAdmin,
  getAllAdmins,
  getAllVoters,
  getOneVoter,
  updateVoter,
  updatedVoterPassword,
} from "../controllers/voterController.js";
import { protect, restricTo } from "../controllers/authController.js";
import { candidateProtect } from "../controllers/candidateController.js";
import {
  activateAccount,
  deactivateAccount,
  deleteVoter,
  getAllDeActiveAccounts,
} from "../controllers/adminController.js";

const router = express.Router();

router
  .route("/")
  .get(getAllVoters)
  .post(protect, restricTo("admin"), createVoter);
router
  .route("/deactivated")
  .get(protect, restricTo("admin"), getAllDeActiveAccounts);
router
  .route("/activate/:id")
  .patch(protect, restricTo("admin"), activateAccount);
router
  .route("/deactivate/:id")
  .patch(protect, restricTo("admin"), deactivateAccount);

router
  .route("/delete-voter/:id")
  .delete(protect, restricTo("admin"), deleteVoter);

router.route("/admins").get(protect, restricTo("admin"), getAllAdmins);
router.route("/:id").get(getOneVoter);

router
  .route("/:id")
  .patch(protect, restricTo("admin"), updateVoter)
  .put(protect, restricTo("admin"), updatedVoterPassword);
router.route("/admin").post(protect, restricTo("admin"), createAdmin);
router.route("/admin/:id").get(protect, restricTo("admin"), getAdmin);

export default router;
