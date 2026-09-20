const nodemailer = require('nodemailer');

const sendOtpEmail = async (email, otp, purpose = 'registration') => {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const secure = port === 465 || process.env.SMTP_SECURE === 'true';

  if (!user || !pass) {
    console.log(`[SMTP Mailer Notice] Real email NOT sent because SMTP_USER or SMTP_PASS is missing in backend/.env.`);
    console.log(`[SMTP Mailer OTP Debug] Generated OTP for ${email} (${purpose}): ${otp}`);
    return { success: true, mocked: true, otp };
  }

  const configuredFrom = process.env.SMTP_FROM;
  const fromEmail = (configuredFrom && !configuredFrom.includes('srs-ambiguity-detector.com'))
    ? configuredFrom
    : user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const title = purpose === 'login' ? 'Login Verification Code' : 'Email Verification Code';
  const actionText = purpose === 'login' 
    ? 'Use the verification code below to complete your login:'
    : 'Thank you for registering with SRS Ambiguity Detector. Use the verification code below to activate your account:';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">${actionText}</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 14px 28px;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #0284c7;">
            ${otp}
          </span>
        </div>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
        This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
        SRS Ambiguity Detector &bull; SMTP Service
      </p>
    </div>
  `;

  const textContent = `${title}:\n\nYour 6-digit OTP code is: ${otp}\n\nThis code will expire in 10 minutes.`;

  try {
    const info = await transporter.sendMail({
      from: `"SRS Ambiguity Detector" <${fromEmail}>`,
      to: email,
      subject: `${otp} is your ${title} - SRS Ambiguity Detector`,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[SMTP Mailer Success] OTP email sent successfully to ${email} (${purpose}): ${info.messageId}`);
    return { success: true, messageId: info.messageId, otp };
  } catch (error) {
    console.error(`[SMTP Mailer Error] Failed to send OTP to ${email}:`, error.message);
    return { success: false, error: error.message, otp };
  }
};

module.exports = {
  sendOtpEmail,
};
