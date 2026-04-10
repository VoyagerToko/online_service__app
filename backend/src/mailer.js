import nodemailer from "nodemailer";

import { config } from "./config.js";

const transporter = nodemailer.createTransport({
  host: config.mailServer,
  port: config.mailPort,
  secure: config.mailSslTls,
  auth: config.mailUsername ? { user: config.mailUsername, pass: config.mailPassword } : undefined,
  requireTLS: config.mailStartTls,
  tls: {
    rejectUnauthorized: config.appEnv === "production",
  },
});

async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `${config.mailFromName} <${config.mailFrom}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Mail send skipped:", error.message);
  }
}

export async function sendVerificationEmail(to, token, name) {
  const verifyUrl = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const html = `
    <h2>Welcome to Servify, ${name}!</h2>
    <p>Click the link below to verify your email address:</p>
    <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">
      Verify Email
    </a>
    <p>This link expires in 24 hours.</p>
  `;
  await sendMail({ to, subject: "Verify your Servify account", html });
}

export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const html = `
    <h2>Reset your Servify password</h2>
    <p>We received a request to reset the password for your account.</p>
    <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">
      Reset Password
    </a>
    <p>This link expires in 1 hour.</p>
  `;
  await sendMail({ to, subject: "Reset your Servify password", html });
}
