import * as brevo from '@getbrevo/brevo';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
    console.error('⚠️ BREVO_API_KEY no está configurada en las variables de entorno');
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const enviarEmailBrevo = async (options: EmailOptions): Promise<boolean> => {
    try {
        console.log('📧 Intentando enviar email con Brevo API...');
        console.log('   Para:', options.to);
        console.log('   Asunto:', options.subject);

        if (!BREVO_API_KEY) {
            console.error('❌ BREVO_API_KEY no está configurada');
            return false;
        }

        const apiInstance = new brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = { name: 'MediConnect', email: 'noreply@mediconnect.com' };
        sendSmtpEmail.to = [{ email: options.to }];
        sendSmtpEmail.subject = options.subject;
        sendSmtpEmail.htmlContent = options.html;

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log('✅ Email enviado exitosamente con Brevo API');
        console.log('   Message ID:', result.body.messageId);
        return true;

    } catch (error: any) {
        console.error('❌ Error al enviar email con Brevo API:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.text);
        }
        return false;
    }
};

export default {
    enviarEmail: enviarEmailBrevo
};
