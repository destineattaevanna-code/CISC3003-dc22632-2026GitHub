document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");
    const emailInput = document.getElementById("email");
    const emailFeedback = document.getElementById("emailFeedback");

    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm_password").value;

            if (password.length < 6) {
                alert("Password must be at least 6 characters.");
                e.preventDefault();
                return;
            }

            if (password !== confirmPassword) {
                alert("Passwords do not match.");
                e.preventDefault();
                return;
            }
        });
    }

    if (emailInput) {
        emailInput.addEventListener("blur", function () {
            const email = emailInput.value;

            if (email.length > 0) {
                fetch("check-email.php?email=" + encodeURIComponent(email))
                    .then(response => response.text())
                    .then(data => {
                        emailFeedback.innerHTML = data;
                    });
            }
        });
    }
});
