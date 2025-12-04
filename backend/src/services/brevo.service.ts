import nodemailer from 'nodemailer';

const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER || '9d4915001@smtp-brevo.com';
const BREVO_SMTP_PASSWORD = process.env.BREVO_SMTP_PASSWORD;

if (!BREVO_SMTP_PASSWORD) {
    console.error('⚠️ BREVO_SMTP_PASSWORD no está configurada en las variables de entorno');
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

// Crear transporter de nodemailer con Brevo SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true para puerto 465, false para otros puertos
    auth: {
        user: BREVO_SMTP_USER,
        pass: BREVO_SMTP_PASSWORD
    }
});

export const enviarEmailBrevo = async (options: EmailOptions): Promise<boolean> => {
    try {
        console.log('📧 Intentando enviar email con Brevo SMTP...');
        console.log('   Para:', options.to);
        console.log('   Asunto:', options.subject);
        console.log('   SMTP User:', BREVO_SMTP_USER);

        if (!BREVO_SMTP_PASSWORD) {
            console.error('❌ BREVO_SMTP_PASSWORD no está configurada');
            return false;
        }

        const info = await transporter.sendMail({
            from: '"MediConnect" <noreply@mediconnect.com>',
            to: options.to,
            subject: options.subject,
            html: options.html
        });

        console.log('✅ Email enviado exitosamente con Brevo SMTP');
        console.log('   Message ID:', info.messageId);
        return true;

    } catch (error: any) {
        console.error('❌ Error al enviar email con Brevo SMTP:', error.message);
        return false;
    }
};

export default {
    enviarEmail: enviarEmailBrevo
};
