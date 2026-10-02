const nodemailer = require('nodemailer');

// Picks how emails are delivered:
//  1. SMTP_HOST set          -> real SMTP (Gmail, Brevo, Mailtrap, etc.)
//  2. development, online    -> free Ethereal test inbox (gives a "preview" URL)
//  3. development, offline   -> prints the email to the console
let transporter = null;
let mode = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // true for 465, STARTTLS for 587
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    mode = 'smtp';
  } else {
    try {
      const account = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      });
      mode = 'ethereal';
      console.log('✉  No SMTP configured — using an Ethereal test inbox (emails are not really delivered)');
    } catch {
      transporter = nodemailer.createTransport({ jsonTransport: true });
      mode = 'console';
      console.log('✉  No SMTP and no internet — emails will be printed to this console');
    }
  }
  return transporter;
}

/**
 * Sends an email. Returns { previewUrl } in development so the UI can link to it.
 */
async function sendMail({ to, subject, html, text }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.MAIL_FROM || 'Meshwatch <no-reply@meshwatch.dev>',
    to,
    subject,
    html,
    text,
  });

  if (mode === 'ethereal') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉  Email to ${to}: ${previewUrl}`);
    return { previewUrl };
  }
  if (mode === 'console') {
    console.log(`\n✉  ---- Email to ${to} ----\nSubject: ${subject}\n\n${text}\n------------------------\n`);
  }
  return {};
}

function mailMode() {
  return mode;
}

module.exports = { sendMail, mailMode, getTransporter };
