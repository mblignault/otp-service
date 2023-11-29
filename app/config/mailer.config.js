const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "127.0.0.1",
    port: 1025,
    secure: false,
    auth: {
        user: "mailhog",
        pass: "mailhog",
    },
});

module.exports = transporter;
