import { supabase } from '../../supabaseClient';

/**
 * Servicio de envío de correos electrónicos real.
 * Invoca la Edge Function 'send-email'.
 */

export const sendEventInvitation = async (
  event: any,
  teamName: string,
  creatorName: string,
  recipients: string[]
) => {
  console.log("🚀 Iniciando envío de correos a:", recipients);

  if (!recipients.length) return { success: true, count: 0 };

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        recipients: recipients,
        subject: `🍩 Nueva Merienda: ${event.title}`,
        html: `
          <h1>¡Merienda en ${teamName}!</h1>
          <p><strong>${creatorName}</strong> ha creado: <strong>${event.title}</strong></p>
          <p>📅 ${new Date(event.start_time).toLocaleString()}</p>
          <p>📍 ${event.location || 'Sin ubicación'}</p>
          <br/>
          <p>Entra en la app para confirmar.</p>
        `
      },
    });

    if (error) throw error;
    console.log('✅ Email enviado:', data);
    return { success: true, count: recipients.length };

  } catch (err) {
    console.error('❌ Error enviando email:', err);
    return { success: false, error: err, count: 0 };
  }
};
