require('dotenv').config();
const nodemailer = require('nodemailer');

const testSmtp = async () => {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = port === 465 || process.env.SMTP_SECURE === 'true';
  const fromEmail = process.env.SMTP_FROM || user || 'no-reply@srs-ambiguity-detector.com';

  console.log('--- Testing SMTP Configuration ---');
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`Secure: ${secure}`);
  console.log(`User: ${user ? user : '(NOT SET)'}`);
  console.log(`Pass: ${pass ? '********' : '(NOT SET)'}`);
  console.log(`From: ${fromEmail}`);

  if (!user || !pass) {
    console.error('ERROR: SMTP_USER or SMTP_PASS is missing in environment variables!');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    console.log('\n[1/2] Verifying SMTP Connection & Authentication...');
    await transporter.verify();
    console.log('SUCCESS: SMTP connection and authentication verified successfully!');

    console.log('\n[2/2] Attempting to send test email...');
    const info = await transporter.sendMail({
      from: `"SRS Test" <${fromEmail}>`,
      to: user,
      subject: 'Test Email from SRS Ambiguity Detector',
      text: 'If you are reading this email, your SMTP setup is working correctly!',
    });
    console.log(`SUCCESS: Test email sent! Message ID: ${info.messageId}`);
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED: SMTP Error:', err);
    process.exit(1);
  }
};

testSmtp();
