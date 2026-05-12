<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// =========================
// Load PHPMailer manually
// =========================
require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

// Only allow POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: index.php");
    exit;
}

// =========================
// Sanitize and validate input
// =========================
$name = trim(filter_input(INPUT_POST, 'name', FILTER_SANITIZE_SPECIAL_CHARS));
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
$subject = trim(filter_input(INPUT_POST, 'subject', FILTER_SANITIZE_SPECIAL_CHARS));
$message = trim(filter_input(INPUT_POST, 'message', FILTER_SANITIZE_SPECIAL_CHARS));

if (!$name || !$email || !$subject || !$message) {
    die("Invalid input. Please go back and try again.");
}

// =========================
// Create PHPMailer instance
// =========================
$mail = new PHPMailer(true);

try {
    // =========================
    // SMTP Server settings
    // =========================
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;

    // Replace with your Gmail
    $mail->Username   = 'matimbbagain@gmail.com';

    // Replace with your 16-digit Gmail App Password
    $mail->Password   = 'bvuguwchpdrmkhsr';

    // Gmail SMTP: STARTTLS on 587
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // =========================
    // DEBUG MODE
    // =========================
    // For normal sending / PRG, keep this as 0
    // For B.04 debugging screenshot, temporarily change to 2
    $mail->SMTPDebug  = 0;

    // =========================
    // Email settings
    // =========================
    $mail->setFrom('matimbbagain@gmail.com', 'CISC3003 Contact Form');
    $mail->addAddress('matimbbagain@gmail.com', 'MA IAT TIM'); 
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = 'Contact Form: ' . $subject;
    $mail->Body    = "
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> " . htmlspecialchars($name) . "</p>
        <p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
        <p><strong>Subject:</strong> " . htmlspecialchars($subject) . "</p>
        <p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>
    ";
    $mail->AltBody = "Name: $name\nEmail: $email\nSubject: $subject\nMessage:\n$message";

    // =========================
    // Send the email
    // =========================
    $mail->send();

    // =========================
    // B.05 POST / REDIRECT / GET
    // Redirect after successful POST
    // =========================
    header("Location: success.php?status=sent");
    exit;

} catch (Exception $e) {
    echo "<!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Email Error</title>
        <link rel='stylesheet' href='css/styles.css'>
    </head>
    <body>
        <div class='container'>
            <h1>Email Sending Error</h1>
            <p class='error'>Message could not be sent.</p>
            <p><strong>PHPMailer Error:</strong> " . htmlspecialchars($mail->ErrorInfo) . "</p>
            <p><a href='index.php'>Back to Contact Form</a></p>
        </div>

        <footer>
            CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
        </footer>
    </body>
    </html>";
}
?>
``