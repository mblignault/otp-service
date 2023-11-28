const express = require("express");

require("./app/config/db.config.js");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("OTP Service Active");
});

const PORT = process.env.port || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});

const db = require("./app/models");
db.mongoose
    .connect(db.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongodDB Connected"))
    .catch((err) => console.log("MongoDB Connection Error", { err }));
