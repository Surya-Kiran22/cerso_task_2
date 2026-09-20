const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

const sendVerificationEmail = async (email, token, clientOrigin) => {
  const frontendUrl = clientOrigin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@srs-ambiguity-detector.com';

  const transporter = createTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563eb;">Verify your email address</h2>
      <p>Thank you for registering with SRS Ambiguity Detector. Please verify your email address by clicking the button below:</p>
      <div style="margin: 24px 0;">
        <a href="${verificationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verify Email Address</a>
      </div>
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationLink}</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours. If you did not request this, please ignore this email.</p>
    </div>
  `;

  const textContent = `Verify your email address for SRS Ambiguity Detector:\n\n${verificationLink}\n\nThis link will expire in 24 hours.`;

  if (!transporter) {
    console.log(`[SMTP Mailer Notice] SMTP credentials not set. Verification link for ${email}: ${verificationLink}`);
    return { success: true, mocked: true, verificationLink };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SRS Ambiguity Detector" <${fromEmail}>`,
      to: email,
      subject: 'Verify your email address - SRS Ambiguity Detector',
      text: textContent,
      html: htmlContent,
    });
    console.log(`[SMTP Mailer] Verification email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP Mailer Error] Failed to send email to ${email}:`, error);
    return { success: false, error: error.message, verificationLink };
  }
};

module.exports = {
  sendVerificationEmail,
};
