// HTML emails use tables and inline styles because many email apps
// (Gmail, Outlook) ignore <style> tags and modern CSS layout.

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ preheader, heading, body, buttonText, buttonUrl, footnote }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F2F4F3;font-family:Arial,Helvetica,sans-serif;color:#12181B">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F3;padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#0B3C49;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">
        <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:#2FBF71;margin-right:8px"></span>meshwatch
      </td></tr>
      <tr><td style="padding:32px 28px 8px">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(heading)}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 28px 32px">
        <a href="${esc(buttonUrl)}" style="display:inline-block;background:#F5B700;color:#12181B;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:8px">${esc(buttonText)}</a>
        <p style="margin:20px 0 0;font-size:13px;color:#5B6670;line-height:1.5">If the button doesn't work, paste this link into your browser:<br>
        <a href="${esc(buttonUrl)}" style="color:#0B3C49;word-break:break-all">${esc(buttonUrl)}</a></p>
      </td></tr>
      <tr><td style="padding:20px 28px;background:#F7F8F7;font-size:12px;color:#5B6670;line-height:1.5">${footnote}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const p = (t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`;

function verificationEmail({ name, verifyUrl }) {
  const first = esc(name.split(' ')[0]);
  return {
    subject: 'Confirm your email to start your Meshwatch trial',
    html: layout({
      preheader: 'One click and your 14-day trial starts.',
      heading: `Confirm your email, ${first}`,
      body:
        p('Thanks for signing up for Meshwatch. Confirm this is your email address and your 14-day trial starts straight away.') +
        p('This link works for 24 hours.'),
      buttonText: 'Confirm email',
      buttonUrl: verifyUrl,
      footnote: "You're getting this because someone signed up for Meshwatch with this address. If it wasn't you, ignore this email and no account will be created.",
    }),
    text: `Hi ${name.split(' ')[0]},\n\nConfirm your email to start your 14-day Meshwatch trial:\n${verifyUrl}\n\nThis link works for 24 hours. If you didn't sign up, ignore this email.`,
  };
}

function signInEmail({ name, verifyUrl }) {
  const first = esc(name.split(' ')[0]);
  return {
    subject: 'Your Meshwatch sign-in link',
    html: layout({
      preheader: 'Use this link to open your dashboard.',
      heading: `Welcome back, ${first}`,
      body: p('You already have a Meshwatch account with this email. Use the button below to open your dashboard.') + p('This link works for 24 hours.'),
      buttonText: 'Open my dashboard',
      buttonUrl: verifyUrl,
      footnote: "If you didn't ask for this, you can ignore this email. Your account is safe.",
    }),
    text: `Hi ${name.split(' ')[0]},\n\nOpen your Meshwatch dashboard:\n${verifyUrl}\n\nThis link works for 24 hours.`,
  };
}

function welcomeEmail({ name, dashboardUrl, trialEnds }) {
  const first = esc(name.split(' ')[0]);
  const date = trialEnds.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    subject: 'Your Meshwatch trial has started',
    html: layout({
      preheader: 'Connect your first device in about five minutes.',
      heading: `You're in, ${first}`,
      body:
        p(`Your email is confirmed and your trial runs until <strong>${esc(date)}</strong>.`) +
        p('Next step: connect your first device. Your dashboard has your API key and a two-line example for MQTT and HTTP.'),
      buttonText: 'Go to my dashboard',
      buttonUrl: dashboardUrl,
      footnote: 'Questions? Reply to this email and a person will answer.',
    }),
    text: `Hi ${name.split(' ')[0]},\n\nYour email is confirmed and your trial runs until ${date}.\nGo to your dashboard: ${dashboardUrl}`,
  };
}

module.exports = { verificationEmail, signInEmail, welcomeEmail };
