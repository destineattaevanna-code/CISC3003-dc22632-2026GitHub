<?php
$status = $_GET['status'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message Sent</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Scenario B - Result</h1>

    <?php if ($status === 'sent'): ?>
        <p class="success">Your message has been sent successfully!</p>
        <p>This page is loaded using the GET request after redirect.</p>
    <?php else: ?>
        <p class="error">Unknown request status.</p>
    <?php endif; ?>

    <p><a href="index.php">Go back to Contact Form</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>