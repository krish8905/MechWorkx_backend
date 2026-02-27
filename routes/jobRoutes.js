const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { createJob, getCustomerJobs, editJob, getAvailableJobs } = require("../controllers/jobController");

// Customer routes
router.post("/create", auth, authorizeRoles('customer'), createJob);
router.get("/my-jobs", auth, authorizeRoles('customer'), getCustomerJobs);
router.put("/:jobId", auth, authorizeRoles('customer'), editJob);

// Vendor routes
router.get("/available", auth, authorizeRoles('vendor'), getAvailableJobs);

module.exports = router;
