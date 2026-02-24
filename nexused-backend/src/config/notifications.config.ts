import { registerAs } from '@nestjs/config';

export default registerAs('notifications', () => ({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidEmail: process.env.VAPID_EMAIL || 'admin@nexused.app',
}));
