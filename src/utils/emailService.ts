import { supabase } from '../supabaseClient';

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
        subject: `🍩 ¡PLANAZO! ${creatorName} ha creado: ${event.title}`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🍩 ¡Merienda Time!</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Prepárate, que hay evento.</p>
            </div>

            <div style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 25px;">
                <p style="font-size: 18px; color: #374151; line-height: 1.5;">
                  <strong>${creatorName}</strong> ha organizado un nuevo evento para el equipo <strong>${teamName}</strong> y quiere que estés ahí.
                </p>
              </div>

              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
                <h2 style="margin-top: 0; color: #4f46e5; font-size: 22px; text-align: center;">${event.title}</h2>
                
                <table style="width: 100%; margin-top: 15px;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 30px;">📅</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">
                      ${new Date(event.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      a las ${new Date(event.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">📍</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${event.location || 'Ubicación pendiente'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">📝</td>
                    <td style="padding: 8px 0; color: #4b5563; font-style: italic;">
                      "${event.description || 'Sin descripción adicional'}"
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 35px; padding-bottom: 20px;">
                <p style="margin-bottom: 15px; color: #4b5563; font-size: 14px;">¿Te apuntas?</p>
                
                <a href="${window.location.origin}/dashboard?action=rsvp&eventId=${event.id}&status=going" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px; display: inline-block;">
                  ✅ Asistiré
                </a>

                <a href="${window.location.origin}/dashboard?action=rsvp&eventId=${event.id}&status=not_going" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  ❌ No iré
                </a>
              </div>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
              Enviado automáticamente por tu App de Meriendas favorita.
            </div>
          </div>
        </body>
        </html>
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
