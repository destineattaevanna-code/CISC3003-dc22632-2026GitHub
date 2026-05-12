<?php
require_once "php/connect.php";
require_once "php/mailer.php";

$message = "";
$linkForProof = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);

    if (!$email) {
        $message = "Invalid email address.";
    } else {
        $stmt = $conn->prepare("SELECT id, fullname FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($user = $result->fetch_assoc()) {
            $token = bin2hex(random_bytes(16));
            $expiry = date("Y-m-d H:i:s", time() + 3600);

            $updateStmt = $conn->prepare("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?");
            $updateStmt->bind_param("sss", $token, $expiry, $email);
            $updateStmt->execute();

            $reset_link = "http://localhost/CISC3003-FinalExam-Paper02C/reset-password.php?token=" . $token;
            $linkForProof = $reset_link;

            $subject = "Password Reset Request";
            $htmlBody = "
                <h2>Password Reset</h2>
                <p>Hello " . htmlspecialchars($user['fullname']) . ",</p>
                <p>Click the link below to reset your password:</p>
                <p><a href='$reset_link'>$reset_link</a></p>
                <p>This link will expire in 1 hour.</p>
            ";
            $altBody = "Reset your password using this link: $reset_link";

            $mailResult = sendMail($email, $user['fullname'], $subject, $htmlBody, $altBody);

            if ($mailResult[0]) {
                $message = "Password reset email sent successfully.";
            } else {
                $message = "Reset token created, but email sending failed: " . $mailResult[1];
            }
        } else {
            // 安全做法：不直接暴露 email 是否存在
            $message = "If the email exists, a reset link has been generated.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Link Status</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Password Reset Status</h1>
    <p class="<?php echo (strpos($message, 'successfully') !== false || strpos($message, 'generated') !== false) ? 'success' : 'error'; ?>">
        <?php echo htmlspecialchars($message); ?>
    </p>

    <?php if ($linkForProof): ?>
        <p class="info"><strong>Reset link for local testing:</strong></p>
        <p><a href="<?php echo htmlspecialchars($linkForProof); ?>"><?php echo htmlspecialchars($linkForProof); ?></a></p>
    <?php endif; ?>

    <p><a href="login.php">Back to Login</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>