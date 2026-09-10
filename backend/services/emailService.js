const nodemailer = require('nodemailer');

let transporter;

const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
};

const getTransporter = () => {
  if (process.env.NODE_ENV === 'test' && process.env.SMTP_JSON_TRANSPORT === 'true') {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  if (!isEmailConfigured()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const sendPasswordResetEmail = async ({ to, otp }) => {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    return {
      sent: false,
      reason: 'Email service not configured',
    };
  }

  await activeTransporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Your Afroel SMS password reset code',
    text: `You requested a password reset for your Afroel SMS account.\n\nYour verification code is: ${otp}\n\nThis code expires in 15 minutes. Never share it with anyone.\nIf you did not request this, please ignore this email.`,
    html: `
      <p>You requested a password reset for your Afroel SMS account.</p>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 20px 0;">${otp}</p>
      <p>This code expires in <strong>15 minutes</strong>. Never share it with anyone.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });

  return { sent: true };
};

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
};
