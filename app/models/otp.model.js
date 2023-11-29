const dayjs = require("dayjs");
module.exports = (mongoose) => {
    const OTP = mongoose.model(
        "otp",
        mongoose.Schema({
            otp: { type: String, required: true },
            email: { type: String, required: true },
            createdAt: { type: Number, default: () => dayjs().valueOf() },
            updatedAt: { type: Number, default: () => dayjs().valueOf() },
            verified: { type: Boolean, default: false },
            resendCount: { type: Number, default: 0 },
        })
    );
    return OTP;
};
