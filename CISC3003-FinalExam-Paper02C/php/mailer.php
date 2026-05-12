<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../PHPMailer/src/Exception.php';
require __DIR__ . '/../PHPMailer/src/PHPMailer.php';
require __DIR__ . '/../PHPMailer/src/SMTP.php';

function sendMail($toEmail, $toName, $subject, $htmlBody, $altBody = '') {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;

        // 換成你自己的 Gmail
        $mail->Username   = 'matimbbagain@gmail.com';

        // 換成你新的 16 位 App Password（不要空格）
        $mail->Password   = 'bvuguwchpdrmkhsr';

        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // 正式發送用 0；如果你要 debug 可改 2
        $mail->SMTPDebug  = 0;

        $mail->setFrom('matimbbagain@gmail.com', 'CISC3003 User System');
        $mail->addAddress($toEmail, $toName);
        $mail->isHTML(true);

        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody;

        $mail->send();
        return [true, "Mail sent successfully"];
    } catch (Exception $e) {
        return [false, $mail->ErrorInfo];
    }
}
?>
``