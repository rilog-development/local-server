import nodemailer from 'nodemailer';
import { config } from '../config';

class EmailService {
  private isConfigured(): boolean {
    const { host, user, pass, to, from } = config.smtp;
    return Boolean(host && user && pass && to && from);
  }

  async sendStorageAlert(currentMB: number, thresholdMB: number): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('[rilog-email] SMTP not configured — skipping email alert.');
      return;
    }

    const { host, port, secure, user, pass, from, to } = config.smtp;
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    const subject = `[rilog] Storage alert: ${currentMB} MB used (limit ${thresholdMB} MB)`;
    const html = `
      <h2>rilog-local-server — Storage Alert</h2>
      <p>Total log storage has exceeded the configured threshold.</p>
      <table cellpadding="8" style="border-collapse:collapse">
        <tr><td><b>Current size</b></td><td>${currentMB} MB</td></tr>
        <tr><td><b>Threshold</b></td><td>${thresholdMB} MB</td></tr>
        <tr><td><b>Strategy</b></td><td>${config.storage.onExceeded}</td></tr>
      </table>
      <p style="color:#888;font-size:12px">
        Sent by rilog-local-server at ${new Date().toISOString()}
      </p>
    `;

    try {
      await transporter.sendMail({ from, to, subject, html });
      console.log(`[rilog-email] Storage alert sent to ${to}`);
    } catch (err) {
      console.error('[rilog-email] Failed to send alert email:', err);
    }
  }
}

export const emailService = new EmailService();
