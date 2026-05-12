<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Password Reset</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Request Password Reset</h1>

    <form method="POST" action="send-reset.php">
        <label for="email">Email Address:</label>
        <input type="email" id="email" name="email" required>

        <button type="submit">Send Reset Link</button>
    </form>

    <p><a href="login.php">Back to Login</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>