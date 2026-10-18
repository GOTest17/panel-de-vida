/**
 * Convierte el contenido en markdown a una plantilla HTML limpia, sobria y responsive para Resend
 */
export function buildDailyBriefEmailHtml({
  dateFormatted,
  markdownContent,
  appUrl,
}: {
  dateFormatted: string;
  markdownContent: string;
  appUrl: string;
}): string {
  // Transformación básica y segura de markdown a html limpio
  let htmlBody = markdownContent
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 15px; font-weight: 600; color: #111827; margin: 18px 0 8px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 17px; font-weight: 600; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin: 24px 0 12px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 20px 0 12px;">$1</h1>')
    .replace(/^\* (.*$)/gim, '<li style="margin-bottom: 6px; color: #374151; font-size: 14px; line-height: 1.5;">$1</li>')
    .replace(/^- (.*$)/gim, '<li style="margin-bottom: 6px; color: #374151; font-size: 14px; line-height: 1.5;">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li style="margin-bottom: 6px; color: #374151; font-size: 14px; line-height: 1.5;">$1</li>')
    .replace(/\*\*(.*)\*\*/gim, '<strong style="color: #111827;">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" style="color: #111827; text-decoration: underline;">$1</a>')
    .replace(/\n\n/gim, '</p><p style="margin: 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen Matutino - Panel de Vida</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <!-- Encabezado sobrio -->
    <div style="padding: 24px 28px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px;">
        Panel de Vida
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">
        Resumen Matutino
      </h1>
      <div style="font-size: 13px; color: #6b7280; margin-top: 4px; text-transform: capitalize;">
        ${dateFormatted}
      </div>
    </div>

    <!-- Contenido del Resumen -->
    <div style="padding: 24px 28px;">
      <p style="margin: 0 0 12px; color: #374151; font-size: 14px; line-height: 1.6;">
        ${htmlBody}
      </p>
    </div>

    <!-- Pie de página -->
    <div style="padding: 18px 28px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <a href="${appUrl}" style="display: inline-block; padding: 8px 16px; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 500; border-radius: 6px;">
        Abrir Panel de Vida
      </a>
      <p style="margin: 12px 0 0; font-size: 11px; color: #9ca3af;">
        Generado automáticamente por tu asistente personal Panel de Vida.
      </p>
    </div>

  </div>
</body>
</html>`;
}
