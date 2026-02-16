const otpStore = new Map();

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function saveOTP(phone, otp) {
  otpStore.set(phone, {
    otp,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
}

function verifyOTP(phone, otp) {
  const record = otpStore.get(phone);
  if (!record) return false;
  if (Date.now() > record.expires) {
    otpStore.delete(phone);
    return false;
  }
  if (record.otp !== otp) return false;

  otpStore.delete(phone);
  return true;
}

module.exports = { generateOTP, saveOTP, verifyOTP };
