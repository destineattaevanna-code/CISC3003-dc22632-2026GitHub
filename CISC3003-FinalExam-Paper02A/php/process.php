<?php
require_once "connect.php";

// =========================
// A.06 Validate form data using filter functions
// =========================
$fullname = filter_input(INPUT_POST, 'fullname', FILTER_SANITIZE_SPECIAL_CHARS);
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
$gender = filter_input(INPUT_POST, 'gender', FILTER_SANITIZE_SPECIAL_CHARS);
$department = filter_input(INPUT_POST, 'department', FILTER_SANITIZE_SPECIAL_CHARS);
$message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_SPECIAL_CHARS);

// Interests checkbox handling
$interests = isset($_POST['interests']) ? implode(", ", $_POST['interests']) : "None";

// Check required fields
if (!$fullname || !$email || !$gender || !$department || !$message) {
    die("Invalid input. Please go back and fill in all required fields correctly.");
}

// =========================
// A.07 + A.08 Avoid SQL injection using prepared statement
// =========================
$sql = "INSERT INTO feedback (fullname, email, gender, department, interests, message)
        VALUES (?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("Prepare failed: " . $conn->error);
}

$stmt->bind_param("ssssss", $fullname, $email, $gender, $department, $interests, $message);

$result = $stmt->execute();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form Submission Result</title>
    <link rel="stylesheet" href="../css/styles.css">
</head>
<body>

<div class="container">
    <h1>Submission Result</h1>

    <?php if ($result): ?>
        <p class="success">Record inserted successfully!</p>

        <h3>Your Submitted Data:</h3>
        <p><strong>Full Name:</strong> <?php echo htmlspecialchars($fullname); ?></p>
        <p><strong>Email:</strong> <?php echo htmlspecialchars($email); ?></p>
        <p><strong>Gender:</strong> <?php echo htmlspecialchars($gender); ?></p>
        <p><strong>Department:</strong> <?php echo htmlspecialchars($department); ?></p>
        <p><strong>Interests:</strong> <?php echo htmlspecialchars($interests); ?></p>
        <p><strong>Message:</strong> <?php echo htmlspecialchars($message); ?></p>
    <?php else: ?>
        <p class="error">Error inserting record: <?php echo $stmt->error; ?></p>
    <?php endif; ?>

    <p><a href="../index.php">Go back to form</a></p>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>

<?php
$stmt->close();
$conn->close();
?>