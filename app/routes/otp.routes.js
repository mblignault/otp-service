module.exports = (app) => {
    const OTPs = require("../controllers/otp.controller.js");
    const router = require("express").Router();

    // Create OTP endpoint
    router.post("/generate", OTPs.create);

    // Resend OTP endpoint
    router.post("/resend", OTPs.resend);

    // Validate OTP endpoint
    router.put("/validate", OTPs.validate);

    app.use("/api/otp", router);
};
