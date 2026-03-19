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

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
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
    subject: 'Reset your Afroel SMS password',
    text: `You requested a password reset for your Afroel SMS account.\n\nUse this link to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\nIf you did not request this, please ignore this email.`,
    html: `
      <p>You requested a password reset for your Afroel SMS account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link will expire in <strong>15 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });

  return { sent: true };
};

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
};
