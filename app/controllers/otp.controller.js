const dayjs = require("dayjs");
const randomize = require("randomatic");
const db = require("../models");
const OTP = db.otp;

const REQUEST_LIMIT_PER_HOUR = 3;
const OTP_EXPIRY_SEC = 30;
const OTP_RESEND_TIMEOUT_MIN = 5;
const OTP_RESEND_LIMIT = 3;

// Generate OTP
exports.create = async (req, res) => {
    const { email } = req.query;

    // Check for email
    if (!email) {
        res.status(400).send({ success: false, message: "Email cannot be empty." });
        return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).send({ success: false, message: "Email format is invalid." });
        return;
    }

    // Check for existing within 24 hours
    const previousDay = dayjs().subtract(24, "hours").valueOf();
    console.log({ previousDay: previousDay });
    const existingOtps = await OTP.find({
        email: email,
        createdAt: { $gt: previousDay },
    }).sort({ updatedAt: -1 });
    console.log("Existing: ", existingOtps);

    // If in a 24 hour period, generate new one.
    if (existingOtps.length) {
        const latest = existingOtps[0];
        const hourAgo = dayjs().subtract(1, "hour").valueOf();
        const numInLastHour = existingOtps?.filter((x) => x.updatedAt > hourAgo)?.length || 0;

        // If user requests new otp withing x minutes, it will resend original otp + update expiry. However, OTP cannot be sent more than x times
        if (
            dayjs().subtract(OTP_RESEND_TIMEOUT_MIN, "minutes").isBefore(dayjs(latest.updatedAt)) &&
            latest.resendCount < OTP_RESEND_LIMIT
        ) {
            // Update time
            console.log("Resending");
            latest.updatedAt = dayjs().valueOf();
            latest.resendCount += 1;
            await latest.save();
            return res.send({ success: true, otp: latest.otp });
        }

        // Cannot generate more than x OTPs per hour
        if (numInLastHour >= REQUEST_LIMIT_PER_HOUR) {
            const openAgain = dayjs(latest.updatedAt).add(3, "hours");
            const currentMoment = dayjs();
            const minsUtilOpen = openAgain.diff(currentMoment, "minutes", true);
            const hours = Math.floor(minsUtilOpen / 60);
            const minutes = Math.floor(minsUtilOpen % 60);
            console.log("Open again: ", minsUtilOpen, "Hours: ", hours, "Min: ", minutes);
            let baseMessage = "OTP send limit reached. Please try again after ";
            if (hours > 0) {
                baseMessage += `${hours} hour${hours > 1 ? "s" : ""}`;
            }

            if (minutes > 0) {
                if (hours > 0) baseMessage += " and ";
                baseMessage += `${minutes} minute${minutes > 1 ? "s" : ""}`;
            }

            return res.status(429).send({ success: false, message: baseMessage });
        }

        // If everything is within rage, generate new OTP
        const newOtp = generateOTP(email);
        await newOtp.save();
        return res.send({ success: true, otp: newOtp.otp });
    } else {
        const newOtp = generateOTP(email);
        await newOtp.save();
        return res.send({ success: true, otp: newOtp.otp });
    }
};

// Validate OTP
exports.validate = async (req, res) => {
    const { email, otp } = req.query;

    // Validate the input
    if (!email || !otp) {
        return res.status(400).send({ success: false, message: "Email and OTP are required for validation." });
    }

    // Only latest OTP Valid
    const latestOtp = OTP.findOne({ email: email }).sort({ updatedAt: -1 });

    if (!latestOtp) {
        return res.status(404).send({ success: false, message: "OTP not found." });
    }

    // Validate OTP
    if (latestOtp.otp === otp) {
        // OTP expires after x seconds
        if (dayjs().isAfter(dayjs(latestOtp.updatedAt).add(OTP_EXPIRY_SEC, "seconds"))) {
            return res.status(404).send({ success: false, message: "OTP is not valid anymore." });
        }

        // CHeck that it hasnt been used already
        if (latestOtp.validated) {
            return res.status(400).send({ success: false, message: "OTP has already been used." });
        }

        latestOtp.validated = true;
        await latestOtp.save();
        return res.send({ success: true, message: "OTP is valid." });
    } else {
        return res.status(400).send({ success: false, message: "Invalid OTP." });
    }
};

function generateOTP(email) {
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

    return newOtp;
}
