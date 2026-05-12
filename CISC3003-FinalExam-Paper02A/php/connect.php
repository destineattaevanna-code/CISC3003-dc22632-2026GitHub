<?php
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "paper02a_db";   // A项目改成 paper02a_db, B/C 改对应数据库

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
``