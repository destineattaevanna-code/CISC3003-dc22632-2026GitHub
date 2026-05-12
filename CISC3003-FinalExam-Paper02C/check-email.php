<?php
require_once "php/connect.php";

$email = $_GET['email'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "<span class='error'>Invalid email format</span>";
    exit;
}

$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo "<span class='error'>Email already taken</span>";
} else {
    echo "<span class='success'>Email available</span>";
}
?>