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
          <div style="font-family: sans-serif; padding: 20px; background: #f9fafb;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 600px; margin: auto;">
              <h1 style="color: #4f46e5; margin-top: 0;">🍩 ¡Merienda a la vista!</h1>
              <p style="color: #374151; font-size: 16px;">Se ha convocado un nuevo evento en tu equipo.</p>
              <h2 style="color: #111827;">${event.title}</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;">📅 <strong>Cuándo:</strong> ${new Date(event.start_time).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</p>
                <p style="margin: 0;">📍 <strong>Dónde:</strong> ${event.location || 'Por definir'}</p>
              </div>
              <a href="https://merendola-calendar.vercel.app/dashboard" style="display:inline-block; background:#4f46e5; color:white; padding:15px 25px; text-decoration:none; border-radius:8px; font-weight: bold; margin-top:20px;">Confirmar Asistencia</a>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; pt: 20px;">
                Organizado por ${creatorName} en el equipo ${teamName}.
              </p>
            </div>
          </div>
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
