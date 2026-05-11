const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

let transporter = null;
let mode = 'console';

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '465', 10),
    secure: String(SMTP_SECURE || 'true').toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  mode = 'smtp';
  transporter.verify().then(
    () => console.log('[mailer] SMTP ready via', SMTP_HOST),
    (err) => {
      console.warn('[mailer] SMTP verify failed, falling back to console mode:', err.message);
      transporter = null;
      mode = 'console';
    }
  );
} else {
  console.warn('[mailer] No SMTP_* configured; running in CONSOLE mode (codes will be printed to terminal).');
}

function buildFrom() {
  return SMTP_FROM || (SMTP_USER ? `iSuperviz Team07 <${SMTP_USER}>` : 'iSuperviz Team07 <no-reply@localhost>');
}

function brandedHtml({ title, intro, code, actionText }) {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;border:1px solid #eee;border-radius:12px;color:#1f1f1f">
    <div style="text-align:center;margin-bottom:16px">
      <div style="display:inline-flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#9254de,#531dab);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700">iS</div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#722ed1">iSuperviz</div>
      </div>
      <div style="font-size:12px;color:#888;margin-top:4px">CISC3003 Team 07 &middot; Your AI Research Supervisor</div>
    </div>
    <h2 style="color:#531dab;margin:0 0 12px">${title}</h2>
    <p style="line-height:1.7;color:#444;margin:0 0 16px">${intro}</p>
    <div style="background:#f9f0ff;border:1px dashed #d3adf7;border-radius:12px;padding:18px;text-align:center;margin:16px 0">
      <div style="font-size:12px;color:#722ed1;letter-spacing:2px;text-transform:uppercase">${actionText}</div>
      <div style="font-size:34px;font-weight:700;letter-spacing:6px;color:#22075e;margin-top:8px">${code}</div>
      <div style="font-size:12px;color:#888;margin-top:8px">This code expires in 10 minutes.</div>
    </div>
    <p style="font-size:12px;color:#888;line-height:1.6">If you didn't request this, you can safely ignore this email. Need help? Just reply to this message.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="font-size:12px;color:#aaa;text-align:center;margin:0">&copy; ${new Date().getFullYear()} iSuperviz &middot; Team 07 &middot; University of Macau, CISC3003</p>
  </div>`;
}

async function sendVerificationEmail(to, code, purpose = 'signup') {
  const isSignup = purpose === 'signup';
  const subject = isSignup
    ? 'Verify your iSuperviz account'
    : 'Reset your iSuperviz password';
  const intro = isSignup
    ? "Thanks for joining iSuperviz! Please use the verification code below to complete your sign-up."
    : "We received a password reset request for your account. Use the code below to continue.";
  const actionText = isSignup ? 'Your verification code' : 'Your password reset code';
  const html = brandedHtml({ title: subject, intro, code, actionText });
  const text = `${subject}\n\n${intro}\n\nCode: ${code}\n(This code expires in 10 minutes.)`;

  if (!transporter) {
    console.log('==============================================');
    console.log(`[mailer:console] To:      ${to}`);
    console.log(`[mailer:console] Subject: ${subject}`);
    console.log(`[mailer:console] Code:    ${code}`);
    console.log('==============================================');
    return { ok: true, mode: 'console' };
  }

  try {
    const info = await transporter.sendMail({
      from: buildFrom(),
      to,
      subject,
      text,
      html,
    });
    console.log(`[mailer:smtp] sent to ${to} messageId=${info.messageId}`);
    return { ok: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error('[mailer:smtp] failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendVerificationEmail, getMode: () => mode };
