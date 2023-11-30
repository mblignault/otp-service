document.addEventListener("DOMContentLoaded", () => {
    console.log("Js connected");
    const requestForm = document.getElementById("request-form");

    requestForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        console.log("Submit button clicked", email);
        requestOTP(email);
    });
});

function requestOTP(email) {
    fetch(`api/otp/generate?email=${email}`, {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        // body: JSON.stringify({ email: email }),
    })
        .then((response) => response.json())
        .then((data) => console.log("Generate Data: ", data))
        .catch((err) => console.error("Error: ", err));
}

function validateOTP(email, otp) {
    fetch(`api/otp/validate?email=${email}&otp=${otp}`, {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        // body: JSON.stringify({ email: email, otp: otp }),
    })
        .then((response) => response.json())
        .then((data) => console.log("Validate Data: ", data))
        .catch((err) => console.error("Error: ", err));
}
