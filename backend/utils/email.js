// Email utility - Console logging for now (ready for real email service)

const sendEmail = async (to, subject, htmlContent) => {
  console.log('📧 EMAIL NOTIFICATION');
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Content Preview: ${htmlContent.substring(0, 200)}...`);
  
  // When you're ready to use Resend or another email service:
  // 1. Install: npm install resend
  // 2. Add RESEND_API_KEY to .env
  // 3. Uncomment below:
  
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // 
  // try {
  //   const data = await resend.emails.send({
  //     from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
  //     to: [to],
  //     subject: subject,
  //     html: htmlContent
  //   });
  //   return { success: true, data };
  // } catch (error) {
  //   console.error('Email send error:', error);
  //   throw error;
  // }
  
  return { success: true, logged: true };
};

// Email templates
const templates = {
  welcomeAgent: (name, userId) => ({
    subject: 'Welcome to Admin Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Admin Portal!</h2>
        <p>Hi ${name},</p>
        <p>Your agent account has been created successfully.</p>
        <p><strong>Your User ID:</strong> ${userId}</p>
        <p>You can now log in to the portal and start managing events and student registrations.</p>
        <br>
        <p>Best regards,<br>Admin Portal Team</p>
      </div>
    `
  }),
  
  eventAssignment: (agentName, eventTitle, eventDate) => ({
    subject: `New Event Assignment: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Event Assignment</h2>
        <p>Hi ${agentName},</p>
        <p>You have been assigned to a new event:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Event:</strong> ${eventTitle}</p>
          <p><strong>Date:</strong> ${eventDate}</p>
        </div>
        <p>Please log in to the portal to view more details.</p>
        <br>
        <p>Best regards,<br>Admin Portal Team</p>
      </div>
    `
  }),
  
  studentRegistration: (studentName, eventTitle) => ({
    subject: `Registration Confirmed: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Registration Confirmed!</h2>
        <p>Hi ${studentName},</p>
        <p>Thank you for registering for <strong>${eventTitle}</strong>.</p>
        <p>We have received your information and will contact you soon with more details.</p>
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

module.exports = { sendEmail, templates };
