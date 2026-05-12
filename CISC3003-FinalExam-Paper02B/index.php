<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scenario B - Contact Form</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div class="container">
    <h1>Scenario B - Contact Form</h1>
    <p>Please fill in the form below to send a message.</p>

    <form action="send.php" method="POST" novalidate>
        <label for="name">Full Name:</label>
        <input 
            type="text" 
            id="name" 
            name="name" 
            required 
            minlength="2" 
            maxlength="100"
            placeholder="Enter your full name">

        <label for="email">Email Address:</label>
        <input 
            type="email" 
            id="email" 
            name="email" 
            required
            placeholder="Enter your email">

        <label for="subject">Subject:</label>
        <input 
            type="text" 
            id="subject" 
            name="subject" 
            required 
            minlength="3"
            maxlength="150"
            placeholder="Enter the subject">

        <label for="message">Message:</label>
        <textarea 
            id="message" 
            name="message" 
            rows="6" 
            required 
            minlength="10"
            maxlength="1000"
            placeholder="Write your message here"></textarea>

        <button type="submit">Send Message</button>
    </form>
</div>

<footer>
    CISC3003 Web Programming: MA IAT TIM + DC226328 + 2026
</footer>

</body>
</html>
``