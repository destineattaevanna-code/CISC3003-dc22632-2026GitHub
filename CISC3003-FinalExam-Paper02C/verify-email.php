<?php
require_once "php/connect.php";

$message = "Invalid request.";

$token = $_GET['token'] ?? '';

if ($token) {
    $stmt = $conn->prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $message = "Email verified successfully. You can now login.";
    } else {
        $message = "Invalid or expired verification token.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Email</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Email Verification</h1>
    <p class="<?php echo (strpos($message, 'successfully') !== false) ? 'success' : 'error'; ?>">
        <?php echo htmlspecialchars($message); ?>
    </p>
    <p><a href="login.php">Go to Login</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>