const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    otp: { type: String, required: true },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: "30s" }, // OTP Expiration time, wil be auto deleted
    updatedAt: { type: Date, default: Date.now },
});

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;
