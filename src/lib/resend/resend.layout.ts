/**
 * src/lib/resend/resend.layout.ts
 *
 * The single shared HTML shell every template renders its content
 * into — one place for brand styling (colors, typography, footer),
 * so the six templates below only ever supply their own body content,
 * never re-implement the wrapper.
 */

const BRAND_COLOR = '#1a1a1a';
const ACCENT_COLOR = '#8b6f47';

export function renderEmailLayout(params: { previewText?: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>A Productions</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Georgia,'Times New Roman',serif;">
  ${params.previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(params.previewText)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:32px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;letter-spacing:2px;text-transform:uppercase;">A Productions</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;color:#333333;font-size:15px;line-height:1.6;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f5f5f0;padding:24px 40px;text-align:center;border-top:1px solid #e5e5e0;">
              <p style="margin:0;color:#888888;font-size:12px;">
                A Productions — Luxury Indian Fashion &amp; Bespoke Tailoring
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${ACCENT_COLOR};border-radius:2px;">
      <a href="${escapeAttribute(url)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
