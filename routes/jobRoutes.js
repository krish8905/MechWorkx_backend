const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { sendJobOTP, verifyAndSubmitJob, getCustomerJobs, editJob, getAvailableJobs, getOngoingJobs } = require("../controllers/jobController");

// Customer routes
router.post("/send-otp", auth, authorizeRoles('customer'), sendJobOTP);
router.post("/verify-otp-submit", auth, authorizeRoles('customer'), verifyAndSubmitJob);
router.get("/my-jobs", auth, authorizeRoles('customer'), getCustomerJobs);
router.put("/:jobId", auth, authorizeRoles('customer'), editJob);

// Ongoing jobs for both roles
router.get("/ongoing", auth, getOngoingJobs);

// Vendor routes
router.get("/available", auth, authorizeRoles('vendor'), getAvailableJobs);

module.exports = router;
