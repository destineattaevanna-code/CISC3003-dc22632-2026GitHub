<?php
require_once "php/connect.php";

$message = "";
$showForm = false;
$token = $_GET['token'] ?? $_POST['token'] ?? '';

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    if ($token) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()");
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $showForm = true;
        } else {
            $message = "Invalid or expired reset token.";
        }
    } else {
        $message = "No reset token provided.";
    }
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $new_password = $_POST['new_password'] ?? '';

    if (strlen($new_password) < 6) {
        $message = "Password must be at least 6 characters.";
        $showForm = true;
    } else {
        $stmt = $conn->prepare("SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()");
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $password_hash = password_hash($new_password, PASSWORD_DEFAULT);

            $updateStmt = $conn->prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?");
            $updateStmt->bind_param("ss", $password_hash, $token);

            if ($updateStmt->execute()) {
                $message = "Password reset successful. You can now login.";
                $showForm = false;
            } else {
                $message = "Failed to reset password.";
                $showForm = true;
            }
        } else {
            $message = "Invalid or expired reset token.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Reset Password</h1>

    <?php if ($message): ?>
        <p class="<?php echo (strpos($message, 'successful') !== false) ? 'success' : 'error'; ?>">
            <?php echo htmlspecialchars($message); ?>
        </p>
    <?php endif; ?>

    <?php if ($showForm): ?>
        <form method="POST">
            <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">

            <label for="new_password">New Password:</label>
            <input type="password" id="new_password" name="new_password" required>

            <button type="submit">Reset Password</button>
        </form>
    <?php endif; ?>

    <p><a href="login.php">Back to Login</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>