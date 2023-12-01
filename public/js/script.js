document.addEventListener("DOMContentLoaded", () => {
    console.log("Js connected");
    const requestForm = document.getElementById("request-form");
    const validateForm = document.getElementById("validation-form");

    if (requestForm) {
        requestForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;

            const submitType = e.submitter.value;
            if (submitType === "resend") {
                console.log("Resend button clicked", email);
                requestOTP(email, "resend");
            } else {
                console.log("Submit button clicked", email);
                requestOTP(email, "generate");
            }
        });
    }

    if (validateForm) {
        validateForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("validation-email").value;
            const otp = document.getElementById("validation-otp").value;
            console.log("Submit button clicked", email, otp);
            validateOTP(email, otp);
        });
    }
});

function requestOTP(email, type = "generate") {
    notificationDiv = document.getElementById("generate-notification");
    notificationDiv.textContent = "";
    notificationDiv.classList.remove("error-message");
    notificationDiv.classList.remove("success-message");
    fetch(`api/otp/${type}?email=${email}`, {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Generate Data: ", data);
            if (data.success === false) {
                notificationDiv.classList.add("error-message");
            } else {
                notificationDiv.classList.add("success-message");
            }
            notificationDiv.textContent = data.message;
        })
        .catch((err) => {
            console.error("Error: ", err);
            notificationDiv.classList.add("error-message");
            notificationDiv.textContent = "Error generating OTP.";
        });
}

function resendOTP(email) {
    console.log("Resending");
}

function validateOTP(email, otp) {
    notificationDiv = document.getElementById("validate-notification");
    notificationDiv.textContent = "";
    notificationDiv.classList.remove("error-message");
    notificationDiv.classList.remove("success-message");
    fetch(`api/otp/validate?email=${email}&otp=${otp}`, {
        method: "PUT",
        headers: {
            "Content-type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Validate Data: ", data);
            if (data.success === false) {
                notificationDiv.classList.add("error-message");
            } else {
                notificationDiv.classList.add("success-message");
            }
            notificationDiv.textContent = data.message;
        })
        .catch((err) => {
            console.error("Error: ", err);
            notificationDiv.classList.add("error-message");
            notificationDiv.textContent = "Error validating OTP.";
        });
}
