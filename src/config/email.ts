import { Resend } from 'resend';
import { env } from './env';

export const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = env.EMAIL_FROM || 'Tonalli <noreply@tonalli.app>';
const APP_URL = env.APP_BASE_URL || 'https://tonalli.app';

export async function sendPasswordResetEmail(to: string, token: string, userName: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Restablecer tu contraseña — Tonalli',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #b8860b, #daa520); padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: #0a0a0a; font-size: 28px; font-weight: 700;">Tonalli</h1>
          <p style="margin: 8px 0 0; color: #1a1a1a; font-size: 14px;">Plataforma de gestión para restaurantes</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #daa520; margin: 0 0 16px; font-size: 20px;">Hola ${userName},</h2>
          <p style="line-height: 1.6; margin: 0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Haz clic en el botón para crear una nueva contraseña:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background: linear-gradient(135deg, #b8860b, #daa520); color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="line-height: 1.6; color: #888; font-size: 14px;">
            Si no solicitaste este cambio, ignora este correo. El enlace expira en <strong>1 hora</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Tonalli — tonalli.app
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to: string, userName: string, code: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verifica tu email — Tonalli',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #b8860b, #daa520); padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: #0a0a0a; font-size: 28px; font-weight: 700;">Tonalli</h1>
          <p style="margin: 8px 0 0; color: #1a1a1a; font-size: 14px;">Verificacion de email</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #daa520; margin: 0 0 16px; font-size: 20px;">Hola ${userName},</h2>
          <p style="line-height: 1.6; margin: 0 0 24px;">
            Usa el siguiente codigo para verificar tu cuenta:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="background: #1a1a1a; border: 2px solid #daa520; border-radius: 12px; padding: 20px 40px; display: inline-block;">
              <span style="font-size: 36px; font-weight: 700; color: #daa520; letter-spacing: 8px; font-family: monospace;">${code}</span>
            </div>
          </div>
          <p style="line-height: 1.6; color: #888; font-size: 14px;">
            Este codigo expira en <strong>24 horas</strong>. Si no creaste esta cuenta, ignora este correo.
          </p>
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Tonalli — tonalli.app
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, userName: string, restaurantName: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Bienvenido a Tonalli, ${userName}!`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #b8860b, #daa520); padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: #0a0a0a; font-size: 28px; font-weight: 700;">Tonalli</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #daa520; margin: 0 0 16px;">Bienvenido, ${userName}!</h2>
          <p style="line-height: 1.6;">
            Tu restaurante <strong>${restaurantName}</strong> ya está registrado en Tonalli.
            Ahora puedes configurar tu menú digital, gestionar pedidos y mucho más.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard"
               style="background: linear-gradient(135deg, #b8860b, #daa520); color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Ir al Dashboard
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Tonalli — tonalli.app
          </p>
        </div>
      </div>
    `,
  });
}
