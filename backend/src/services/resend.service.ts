import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
    console.error('⚠️ RESEND_API_KEY no está configurada en las variables de entorno');
}

const resend = new Resend(resendApiKey);

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const enviarEmailResend = async (options: EmailOptions): Promise<boolean> => {
    try {
        console.log('📧 Intentando enviar email con Resend...');
        console.log('   Para:', options.to);
        console.log('   Asunto:', options.subject);

        const { data, error } = await resend.emails.send({
            from: 'MediConnect <onboarding@resend.dev>', // Cambiarás esto cuando tengas dominio verificado
            to: options.to,
            subject: options.subject,
            html: options.html
        });

        if (error) {
            console.error('❌ Error al enviar email con Resend:', error);
            return false;
        }

        console.log('✅ Email enviado exitosamente con Resend');
        console.log('   ID del email:', data?.id);
        return true;

    } catch (error: any) {
        console.error('❌ Error general al enviar email:', error);
        return false;
    }
};

export default {
    enviarEmail: enviarEmailResend
};
