<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scenario A - Feedback Form</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Scenario A - Feedback Form</h1>

    <form action="php/process.php" method="POST">
        
        <!-- A.02 Simple text input -->
        <label for="fullname">Full Name:</label>
        <input type="text" id="fullname" name="fullname" required>

        <label for="email">Email Address:</label>
        <input type="email" id="email" name="email" required>

        <!-- A.04 Radio buttons -->
        <label>Gender:</label>
        <div class="radio-group">
            <label><input type="radio" name="gender" value="Male" required> Male</label>
            <label><input type="radio" name="gender" value="Female"> Female</label>
        </div>

        <!-- A.04 Select list -->
        <label for="department">Department:</label>
        <select id="department" name="department" required>
            <option value="">-- Select Department --</option>
            <option value="IT">IT</option>
            <option value="Business">Business</option>
            <option value="Design">Design</option>
        </select>

        <!-- A.04 Checkboxes -->
        <label>Interests:</label>
        <div class="checkbox-group">
            <label><input type="checkbox" name="interests[]" value="PHP"> PHP</label>
            <label><input type="checkbox" name="interests[]" value="MySQL"> MySQL</label>
            <label><input type="checkbox" name="interests[]" value="JavaScript"> JavaScript</label>
        </div>

        <!-- A.03 Textarea -->
        <label for="message">Message:</label>
        <textarea id="message" name="message" rows="5" required></textarea>

        <button type="submit">Submit</button>
    </form>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>
