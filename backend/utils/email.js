// Email delivery.
//
// Provider is chosen from the environment:
//   RESEND_API_KEY            -> Resend (https://resend.com)
//   SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE) -> any SMTP server
// Sender address: SENDER_EMAIL (for example "QStudy <no-reply@yourdomain.com>").
// With neither provider configured, emails are only written to the server log (development).

const getProvider = () => {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_HOST) return 'smtp';
  return null;
};

const isEmailConfigured = () => getProvider() !== null;
const getEmailProviderName = () => ({ resend: 'Resend', smtp: 'SMTP' }[getProvider()] || 'none (console log only)');

const getSender = () => process.env.SENDER_EMAIL || 'QStudy <onboarding@resend.dev>';

let smtpTransporter = null;
const getSmtpTransporter = () => {
  if (!smtpTransporter) {
    const nodemailer = require('nodemailer');
    const port = Number(process.env.SMTP_PORT) || 587;
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return smtpTransporter;
};

// Sends one email. Throws when the provider rejects it, so callers decide whether that matters.
const sendEmail = async (to, subject, htmlContent) => {
  const provider = getProvider();

  if (!provider) {
    console.log('📧 EMAIL (not sent: no email provider configured)');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    return { success: true, logged: true };
  }

  if (provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: getSender(), to: [to], subject, html: htmlContent })
    });
    if (!response.ok) {
      throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
    }
    return { success: true, provider };
  }

  const info = await getSmtpTransporter().sendMail({ from: getSender(), to, subject, html: htmlContent });
  return { success: true, provider, messageId: info.messageId };
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Email templates
const templates = {
  // The email copy of an in-app notification (an update on a student, payment, contract, university...)
  notification: ({ name, title, message, link }) => ({
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="color:#042C53;">${escapeHtml(title)}</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p style="line-height:1.5;">${escapeHtml(message)}</p>
        ${link ? `<p><a href="${escapeHtml(link)}" style="background:#042C53;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Open in the portal</a></p>` : ''}
        <br>
        <p style="color:#6B7280;font-size:13px;">Best regards,<br>QStudy Team</p>
      </div>
    `
  }),

  agentInvite: (name, link, managerName, expiresAt) => ({
    subject: 'You are invited to join the QStudy Agent Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Join the QStudy Agent Portal</h2>
        <p>Hi ${name || 'there'},</p>
        <p>${managerName ? managerName + ' from QStudy has' : 'QStudy has'} invited you to register as an agent.</p>
        <p><a href="${link}" style="background:#042C53;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Start registration</a></p>
        <p>This link is personal to you and expires on ${new Date(expiresAt).toDateString()}.</p>
        <br>
        <p>Best regards,<br>QStudy Team</p>
      </div>
    `
  }),

  welcomeAgent: (name, userId) => ({
    subject: 'Welcome to Admin Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Admin Portal!</h2>
        <p>Hi ${name},</p>
        <p>Your agent account has been created successfully.</p>
        <p><strong>Your User ID:</strong> ${userId}</p>
        <p>You can now log in to the portal and start managing student registrations.</p>
        <br>
        <p>Best regards,<br>Admin Portal Team</p>
      </div>
    `
  }),
  
  passwordReset: (resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p style="margin-top: 20px; color: #666;">This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Admin Portal Team</p>
      </div>
    `
  })
};

module.exports = { sendEmail, templates, isEmailConfigured, getEmailProviderName };
