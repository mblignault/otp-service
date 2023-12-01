const dayjs = require("dayjs");
const randomize = require("randomatic");
const transporter = require("../config/mailer.config");
const db = require("../models");
const OTP = db.otp;

const REQUEST_LIMIT_PER_HOUR = process.env.REQUEST_LIMIT_PER_HOUR || 3;
const OTP_EXPIRY_SEC = process.env.OTP_EXPIRY_SEC || 30;
const OTP_RESEND_TIMEOUT_MIN = process.env.OTP_RESEND_TIMEOUT_MIN || 5;
const OTP_RESEND_LIMIT = process.env.OTP_RESEND_LIMIT || 3;

// Generate OTP
exports.create = async (req, res) => {
    const { email } = req.query;

    const emailValid = validateEmail(email);
    // Check for email
    if (!emailValid.success) {
        return res.status(400).send({ ...emailValid });
    }

    // A user cannot generate more than x otps in an hour
    const previousOTPsTime = dayjs().subtract(1, "hours").valueOf();
    const existingOtps = await OTP.find({
        email: email,
        createdAt: { $gt: previousOTPsTime },
    }).sort({ updatedAt: -1 });
    console.log("Existing: ", existingOtps);

    const numInLastHour = existingOtps?.length || 0;
    const latest = existingOtps[0];

    // Cannot generate more than x OTPs per hour
    if (numInLastHour >= REQUEST_LIMIT_PER_HOUR) {
        const openAgain = dayjs(latest.updatedAt).add(1, "hours");
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
    const newOtp = await generateOTP(email);
    await newOtp.save();

    const mailOptions = buildMailOptions(email, "Your OTP", `Your OTP is: ${newOtp.otp}.`);
    return transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log("Mail error: ", err);
            return res.status(500).send({ success: false, message: "Error sending OTP." });
        } else {
            return res.send({ success: true, message: "Your OTP has been sent to your email address." });
        }
    });
};

// Generate OTP
exports.resend = async (req, res) => {
    const { email } = req.query;

    const emailValid = validateEmail(email);
    // Check for email
    if (!emailValid.success) {
        return res.status(400).send({ ...emailValid });
    }

    // A user cannot generate more than x otps in an hour
    const previousOTPsTime = dayjs().subtract(OTP_RESEND_TIMEOUT_MIN, "minutes").valueOf();
    const existingOtps = await OTP.find({
        email: email,
        createdAt: { $gt: previousOTPsTime },
    }).sort({ updatedAt: -1 });

    console.log("Existing: ", existingOtps);

    if (existingOtps.length) {
        const latest = existingOtps[0];

        // If user requests new otp withing x minutes, it will resend original otp + update expiry. However, OTP cannot be sent more than x times
        if (
            dayjs().subtract(OTP_RESEND_TIMEOUT_MIN, "minutes").isBefore(dayjs(latest.updatedAt)) &&
            latest.resendCount < OTP_RESEND_LIMIT
        ) {
            // Update time
            latest.updatedAt = dayjs().valueOf();
            latest.resendCount += 1;
            await latest.save();

            const mailOptions = buildMailOptions(email, "Resending Your OTP", `Your OTP has not changed, it is: ${latest.otp}.`);
            return transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log("Mail error: ", err);
                    return res.status(500).send({ success: false, message: "Error sending OTP." });
                } else {
                    return res.send({ success: true, message: "Your OTP has been resent to your email address." });
                }
            });
        } else {
            const errorMesage =
                latest.resendCount >= OTP_RESEND_LIMIT ? "Resend limit reached." : "OTP is not longer valid. Request a new one.";
            return res.status(429).send({ success: false, message: errorMesage });
        }
    } else {
        return res.status(429).send({ success: false, message: "OTP is not longer valid. Request a new one." });
    }
};

// Validate OTP
exports.validate = async (req, res) => {
    const { email, otp } = req.query;

    const emailValid = validateEmail(email);
    // Check for email
    if (!emailValid.success) {
        return res.status(400).send({ ...emailValid });
    }

    // Only latest OTP Valid
    const latestOtp = await OTP.findOne({ email: email }).sort({ updatedAt: -1 });

    if (!latestOtp) {
        return res.status(404).send({ success: false, message: "No OTP for this email found." });
    }

    // Validate OTP
    if (latestOtp.otp === otp) {
        // CHeck that it hasnt been used already
        if (latestOtp.verified) {
            return res.status(400).send({ success: false, message: "OTP has already been used." });
        }

        // OTP expires after x seconds
        if (dayjs().isAfter(dayjs(latestOtp.updatedAt).add(OTP_EXPIRY_SEC, "seconds"))) {
            return res.status(404).send({ success: false, message: "OTP is not valid anymore." });
        }

        latestOtp.verified = true;
        await latestOtp.save();
        return res.send({ success: true, message: "OTP is valid." });
    } else {
        return res.status(400).send({ success: false, message: "Invalid OTP." });
    }
};

// ======================================================= UTILITY FUNCTIONS =======================================================
function validateEmail(email) {
    // Check for email
    if (!email) {
        return { success: false, message: "Email cannot be empty." };
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: "Email format is invalid." };
    }

    return { success: true };
}

async function generateOTP(email) {
    // OTP cannot be used more than once
    let otpNumber = randomize("0", 6);
    let uniqueNumber = false;
    let index = 0;
    const previousDay = dayjs().subtract(24, "hours").valueOf();

    // check if number exists
    while (!uniqueNumber || index > 50) {
        index += 1; // max 50 lookups

        // Check for existing within 24 hours
        const existingNumber = await OTP.findOne({
            otp: otpNumber,
            createdAt: { $gt: previousDay },
        }).sort({ updatedAt: -1 });

        if (existingNumber) {
            otpNumber = randomize("0", 6);
        } else {
            uniqueNumber = true;
        }
    }

    // Create new OTP for the DB
    const newOtp = new OTP({
        otp: otpNumber,
        email: email,
        verified: false,
        resendCount: 0,
    });

    return newOtp;
}

const buildMailOptions = (email, subject, text) => {
    return {
        from: "no-reply@entrostat.xyz",
        to: email,
        subject: subject,
        text: text,
    };
};
