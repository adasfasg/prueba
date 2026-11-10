/**
 * PMForgeX 2FA Email Service
 * Handles dispatching verification OTP codes to user emails.
 */

async function sendOtpEmail({ toEmail, username, otpCode }) {
  const timestamp = new Date().toLocaleTimeString();

  // 1. Always log a clear, high-visibility security box in server logs
  console.log('\n' + '='.repeat(64));
  console.log(`🔐 [PMForgeX 2FA - CÓDIGO DE ACCESO POR CORREO] (${timestamp})`);
  console.log('='.repeat(64));
  console.log(` Destinatario : ${toEmail}`);
  console.log(` Usuario      : ${username || 'N/A'}`);
  console.log(` Código OTP   : ▶▶▶  [ ${otpCode.split('').join(' ')} ]  ◀◀◀`);
  console.log(` Expiración   : 10 minutos`);
  console.log('='.repeat(64) + '\n');

  // 2. If SMTP configuration exists in environment, attempt actual email delivery
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const htmlContent = `
        <div style="background-color: #020617; color: #f8fafc; font-family: sans-serif; padding: 40px 20px; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h1 style="color: #f59e0b; margin-bottom: 8px; font-size: 24px; letter-spacing: 1px;">PMForgeX</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 0;">Plataforma de Gestión para Creadores & Servidores</p>
            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
            
            <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 12px;">Código de Verificación de Inicio de Sesión</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
              Hola <strong>${username || 'Usuario'}</strong>, has solicitado iniciar sesión en tu cuenta de PMForgeX. Utiliza el siguiente código de 6 dígitos para completar el acceso:
            </p>
            
            <div style="background-color: #020617; border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #fbbf24;">
                ${otpCode}
              </span>
            </div>
            
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
              Este código es de un solo uso y caduca en <strong>10 minutos</strong>.<br/>
              Si no has intentado iniciar sesión, protege tu cuenta inmediatamente.
            </p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"PMForgeX Seguridad" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `[PMForgeX] Tu Código de Acceso 2FA: ${otpCode}`,
        html: htmlContent
      });

      console.log(`[Email Service] Correo 2FA enviado exitosamente a ${toEmail}`);
    } catch (err) {
      console.error('[Email Service Warning]: No se pudo conectar al SMTP:', err.message);
    }
  }

  return true;
}

module.exports = {
  sendOtpEmail
};
