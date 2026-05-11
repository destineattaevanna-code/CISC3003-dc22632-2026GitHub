document.addEventListener("DOMContentLoaded", function () {
    const signInForm = document.getElementById("signInForm");
    const signUpForm = document.getElementById("signUpForm");

    const showSignInBtn = document.getElementById("showSignInBtn");
    const showSignUpBtn = document.getElementById("showSignUpBtn");

    const goToSignIn = document.getElementById("goToSignIn");
    const goToSignUp = document.getElementById("goToSignUp");

    const signInInputs = signInForm.querySelectorAll("input");
    const signUpInputs = signUpForm.querySelectorAll("input");

    function setRequiredForSignIn() {
        // Sign In required: Email + Password
        document.getElementById("signin-email").required = true;
        document.getElementById("signin-password").required = true;

        // Sign Up required removed when inactive
        document.getElementById("signup-name").required = false;
        document.getElementById("signup-email").required = false;
        document.getElementById("signup-password").required = false;

        signInInputs.forEach(input => input.disabled = false);
        signUpInputs.forEach(input => input.disabled = true);
    }

    function setRequiredForSignUp() {
        // Sign Up required: Full Name + Email + Create Password
        document.getElementById("signup-name").required = true;
        document.getElementById("signup-email").required = true;
        document.getElementById("signup-password").required = true;

        // Sign In required removed when inactive
        document.getElementById("signin-email").required = false;
        document.getElementById("signin-password").required = false;

        signInInputs.forEach(input => input.disabled = true);
        signUpInputs.forEach(input => input.disabled = false);
    }

    function showSignIn() {
        signInForm.classList.add("active-form");
        signUpForm.classList.remove("active-form");

        showSignInBtn.classList.add("active-btn");
        showSignUpBtn.classList.remove("active-btn");

        setRequiredForSignIn();
    }

    function showSignUp() {
        signUpForm.classList.add("active-form");
        signInForm.classList.remove("active-form");

        showSignUpBtn.classList.add("active-btn");
        showSignInBtn.classList.remove("active-btn");

        setRequiredForSignUp();
    }

    showSignInBtn.addEventListener("click", showSignIn);
    showSignUpBtn.addEventListener("click", showSignUp);
    goToSignIn.addEventListener("click", showSignIn);
    goToSignUp.addEventListener("click", showSignUp);

    signInForm.addEventListener("submit", function (e) {
        if (!signInForm.checkValidity()) {
            e.preventDefault();
            signInForm.reportValidity();
        } else {
            e.preventDefault();
            alert("Sign In form submitted successfully.");
        }
    });

    signUpForm.addEventListener("submit", function (e) {
        if (!signUpForm.checkValidity()) {
            e.preventDefault();
            signUpForm.reportValidity();
        } else {
            e.preventDefault();
            alert("Sign Up form submitted successfully.");
        }
    });

    // Default view = Sign In
    showSignIn();
});
