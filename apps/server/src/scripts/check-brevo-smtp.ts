import dotenv from 'dotenv';
import { verifyEmailTransport } from '../modules/auth/email.service.js';

dotenv.config();

verifyEmailTransport()
  .then(() => console.log('Brevo SMTP connection and authentication succeeded.'))
  .catch(error => {
    console.error('Brevo SMTP check failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
