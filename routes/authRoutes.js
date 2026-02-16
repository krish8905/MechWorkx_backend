const router = require("express").Router();
const {
  register,
  sendOTP,
  verifyOTPController
} = require("../controllers/authController");

router.post("/register", register);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTPController);

module.exports = router;
