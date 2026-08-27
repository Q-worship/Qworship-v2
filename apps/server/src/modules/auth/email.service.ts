import nodemailer from 'nodemailer';

function smtpConfig() {
  const host = process.env.BREVO_SMTP_SERVER;
  const user = process.env.BREVO_LOGIN;
  const password = process.env.BREVO_SMTP_KEY;
  const port = Number(process.env.BREVO_PORT || 587);

  if (!host || !user || !password || !Number.isInteger(port)) {
    throw new Error('Brevo SMTP is not configured. Set BREVO_SMTP_SERVER, BREVO_LOGIN, BREVO_SMTP_KEY, and BREVO_PORT.');
  }

  return { host, user, password, port };
}

function createTransport() {
  const { host, user, password, port } = smtpConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function sender() {
  const { user } = smtpConfig();
  return { name: process.env.EMAIL_FROM_NAME || 'Q-Worship', address: process.env.EMAIL_FROM || user };
}

export async function verifyEmailTransport() {
  await createTransport().verify();
}

export async function sendVerificationEmail(to: string, firstName: string | undefined, code: string) {
  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://qworship.com').replace(/\/$/, '');
  const codeCells = code.split('').map((digit, index) => `<td style="width:54px;height:68px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:21px;font-weight:600;color:#111111;border-right:${index === code.length - 1 ? '0' : '1px solid #dedfe5'};">${digit}</td>`).join('');
  await createTransport().sendMail({
    from: sender(),
    to: { address: to, name: firstName || to },
    subject: 'Your Q-Worship verification code',
    text: `Hello ${firstName || 'there'}, your Q-Worship verification code is ${code}. This single-use code expires in 10 minutes.`,
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Q-Worship verification code</title></head>
<body style="margin:0;padding:0;background:#f3f4f9;color:#090909;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Q-Worship verification code is ${code}. It expires in 10 minutes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f4f9;"><tr><td align="center" style="padding:20px 16px;">
    <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
      <tr><td align="center" style="padding:4px 0 18px;font-size:16px;font-weight:700;">Hello${firstName ? ` ${escapeHtml(firstName)}` : ''}</td></tr>
      <tr><td align="center" style="padding:0 0 18px;color:#f42f92;font-size:76px;line-height:76px;font-weight:800;letter-spacing:-10px;">Q<span style="font-size:36px;letter-spacing:0;">.</span></td></tr>
      <tr><td align="center" style="padding:0 10px 42px;font-size:48px;line-height:1.08;font-weight:800;letter-spacing:-1.5px;">Here&rsquo;s your code</td></tr>
      <tr><td align="center" style="padding:0 38px 42px;color:#3d3d43;font-size:17px;line-height:1.45;">We received a request to verify your Q-Worship account. Use the 6-digit code below to complete your verification. This code is single-use and will expire shortly.</td></tr>
      <tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #d8d9df;border-radius:20px;border-collapse:separate;overflow:hidden;background:#ffffff;"><tr>${codeCells}</tr></table></td></tr>
      <tr><td align="center" style="padding:18px 0 110px;color:#33343a;font-size:15px;">This code expires in 10 minutes</td></tr>
      <tr><td style="border-top:1px solid #d4d5dc;padding:26px 10px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="font-size:14px;font-weight:700;line-height:2.2;">
          <a href="${siteUrl}/privacy" style="color:#090909;text-decoration:none;margin:0 14px;">Privacy Policy</a>&nbsp;&nbsp;&nbsp;
          <a href="${siteUrl}/resources" style="color:#090909;text-decoration:none;margin:0 14px;">Support</a>&nbsp;&nbsp;&nbsp;
          <a href="${siteUrl}/about" style="color:#090909;text-decoration:none;margin:0 14px;">About</a>&nbsp;&nbsp;&nbsp;
          <a href="${siteUrl}/features" style="color:#090909;text-decoration:none;margin:0 14px;">Features</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:28px 10px 36px;color:#3c3c43;font-size:14px;line-height:1.45;"><strong style="color:#8356f3;">Devine Digital Technologies Ltd.</strong><br>United Kingdom &middot; Church Presentation Technology<br>&copy; ${new Date().getFullYear()} Q-Worship. All rights reserved.</td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  });
}

export async function sendPasswordResetEmail(to: string, firstName: string | undefined, resetUrl: string) {
  await createTransport().sendMail({
    from: sender(),
    to: { address: to, name: firstName || to },
    subject: 'Reset your Q-Worship password',
    text: `Reset your Q-Worship password using this link: ${resetUrl}. The link expires in 30 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your password</h2><p>Hello ${escapeHtml(firstName || 'there')},</p><p>Use the button below to choose a new password. This link expires in 30 minutes.</p><p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
  });
}

export async function sendAdminCredentialsEmail(
  to: string,
  firstName: string | undefined,
  temporaryPassword: string,
  options: { roleName?: string; isReset?: boolean; loginUrl: string },
) {
  const subject = options.isReset
    ? 'Your Q-Worship admin password has been reset'
    : 'Your Q-Worship Admin access is ready';
  const roleName = options.roleName || 'Super Admin';
  const intro = options.isReset
    ? 'Your Q-Worship admin password has been reset. Use the temporary password below to sign in.'
    : "You've been granted Q-Worship Admin access. Use the credentials below to sign in.";
  await createTransport().sendMail({
    from: sender(),
    to: { address: to, name: firstName || to },
    subject,
    text: `Hello ${firstName || 'there'}, ${intro}\n\nUsername: ${to}\nTemporary Password: ${temporaryPassword}\nRole: ${roleName}\n\nSign in at: ${options.loginUrl}\n\nYou will be asked to choose a new password the first time you sign in.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2>${escapeHtml(options.isReset ? 'Your admin password has been reset' : "Here's your access")}</h2>
      <p>Hello ${escapeHtml(firstName || 'there')},</p>
      <p>${escapeHtml(intro)}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Username</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;">${escapeHtml(to)}</td></tr>
        <tr><td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Temporary Password</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;font-family:monospace;">${escapeHtml(temporaryPassword)}</td></tr>
        <tr><td style="padding:12px 16px;background:#f9fafb;font-size:14px;color:#6b7280;">Role</td><td style="padding:12px 16px;font-size:14px;font-weight:600;">${escapeHtml(roleName)}</td></tr>
      </table>
      <p><a href="${escapeHtml(options.loginUrl)}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:8px">Sign in</a></p>
      <p style="color:#6b7280;font-size:13px;">You will be asked to choose a new password the first time you sign in.</p>
    </div>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}
