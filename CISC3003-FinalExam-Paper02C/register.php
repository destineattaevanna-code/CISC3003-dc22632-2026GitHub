<?php
require_once "php/connect.php";
require_once "php/mailer.php";

$message = "";
$linkForProof = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $fullname = trim(filter_input(INPUT_POST, 'fullname', FILTER_SANITIZE_SPECIAL_CHARS));
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    if (!$fullname || !$email || !$password || !$confirm_password) {
        $message = "All fields are required.";
    } elseif (strlen($password) < 6) {
        $message = "Password must be at least 6 characters.";
    } elseif ($password !== $confirm_password) {
        $message = "Passwords do not match.";
    } else {
        $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->bind_param("s", $email);
        $checkStmt->execute();
        $result = $checkStmt->get_result();

        if ($result->num_rows > 0) {
            $message = "Email already exists.";
        } else {
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $token = bin2hex(random_bytes(16));

            $stmt = $conn->prepare("INSERT INTO users (fullname, email, password_hash, verification_token) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $fullname, $email, $password_hash, $token);

            if ($stmt->execute()) {
                $verification_link = "http://localhost/CISC3003-FinalExam-Paper02C/verify-email.php?token=" . $token;
                $linkForProof = $verification_link;

                $subject = "Verify Your Email Address";
                $htmlBody = "
                    <h2>Email Verification</h2>
                    <p>Hello " . htmlspecialchars($fullname) . ",</p>
                    <p>Please click the link below to verify your email:</p>
                    <p><a href='$verification_link'>$verification_link</a></p>
                ";
                $altBody = "Please verify your email using this link: $verification_link";

                $mailResult = sendMail($email, $fullname, $subject, $htmlBody, $altBody);

                if ($mailResult[0]) {
                    $message = "Registration successful. Verification email sent.";
                } else {
                    // 即使發信失敗，也把 link 顯示出來方便你截圖與本機測試
                    $message = "Registration successful, but email sending failed: " . $mailResult[1];
                }
            } else {
                $message = "Error: " . $stmt->error;
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register</title>
    <link rel="stylesheet" href="css/styles.css">
    <script src="js/script.js" defer></script>
</head>
<body>

<div class="container">
    <h1>Sign Up</h1>

    <?php if ($message): ?>
        <p class="<?php echo (strpos($message, 'successful') !== false) ? 'success' : 'error'; ?>">
            <?php echo htmlspecialchars($message); ?>
        </p>
    <?php endif; ?>

    <?php if ($linkForProof): ?>
        <p class="info"><strong>Verification link for local testing:</strong></p>
        <p><a href="<?php echo htmlspecialchars($linkForProof); ?>"><?php echo htmlspecialchars($linkForProof); ?></a></p>
    <?php endif; ?>

    <form method="POST" id="registerForm">
        <label for="fullname">Full Name:</label>
        <input type="text" id="fullname" name="fullname" required>

        <label for="email">Email Address:</label>
        <input type="email" id="email" name="email" required>
        <small id="emailFeedback"></small>

        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>

        <label for="confirm_password">Confirm Password:</label>
        <input type="password" id="confirm_password" name="confirm_password" required>

        <button type="submit">Register</button>
    </form>

    <p><a href="login.php">Already have an account? Login here</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>