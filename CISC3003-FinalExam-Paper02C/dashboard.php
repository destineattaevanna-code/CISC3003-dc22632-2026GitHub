<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link rel="stylesheet" href="css/dashboard.css">
</head>
<body>

<div class="dashboard">
    <h1>Welcome, <?php echo htmlspecialchars($_SESSION['fullname']); ?>!</h1>
    <p style="text-align:center;">You became a user on: <?php echo htmlspecialchars($_SESSION['created_at']); ?></p>

    <h2>User Services</h2>
    <ul>
        <li>View Profile</li>
        <li>Edit Account Information</li>
        <li>Change Password</li>
        <li>Contact Support</li>
        <li>Logout</li>
    </ul>

    <p style="text-align:center;">
        <a class="btn" href="logout.php">Logout</a>
    </p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>
``