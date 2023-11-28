const dayjs = require("dayjs");
const randomize = require("randomatic");
const db = require("../models");
const OTP = db.otp;

// Generate OTP
exports.create = async (req, res) => {
    // console.log("Create", { req });
    const { email } = req.query;
    const REQUEST_LIMIT_HOURS = 3;
    const OTP_EXPIRY_SEC = 30;
    const OTP_RESEND_TIMEOUT_MIN = 5;
    const OTP_RESEND_LIMIT = 3;

    // Check for email
    if (!email) {
        res.status(400).send({ message: "Email cannot be empty!" });
        return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).send({ message: "Email format is invalid!" });
        return;
    }

    // Check for existing within 24 hours
    const existingOtp = await OTP.find({
        email: email,
        createdAt: { $gt: dayjs().subtract(24, "hours") },
    });
    console.log("Existing: ", existingOtp);

    // If in a 24 hour period, generate new one.
    if (existingOtp.length) {
        const latest = existingOtp[0];
        
        // OTP cannot be sent more than x times
        if (latest.resendCount >= OTP_RESEND_LIMIT) {
            return res.status(429).send({ message: "OTP resend limit reached. Please try again after 5 minutes." });
        }

        // If user requests new otp withing x minutes, it will resend original otp + update expiry
        if (dayjs().subtract(OTP_RESEND_TIMEOUT_MIN, "minutes").isBefore(dayjs(latest.updatedAt))) {
            console.log("Resending");
            // Update time
            latest.updatedAt = dayjs();
            latest.resendCount += 1;
            await latest.save();
            res.send({ otp: latest.otp });
        }

        // TODO: Cannot generate more than x OTPs per hour
    } else {
        const otpNumber = randomize("0", 6);
        // OTP cannot be used more than once
        // TODO: check if number exists

        // Create new OTP for the DB
        const newOtp = new OTP({
            otp: otpNumber,
            email: email,
            verified: false,
            resendCount: 0,
        });

        await newOtp.save();
        res.send({ otp: otpNumber });
    }
};

// Validate OTP
exports.validate = (req, res) => {
    console.log("Update", { req, res });
    // Only latest OTP Valid
    // OTP expires after x seconds
};
