import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  RESEND_API_KEY: string;
  ANTI_BOT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AntiBot-Token',
};

export const onRequestOptions: PagesFunction = () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = getClientIp(request);

  if (rateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const { email, report, lang } = await request.json();

    if (!email || !report) {
      return new Response(JSON.stringify({ error: 'Missing email or report' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const isKorean = lang === 'ko';
    const subject = isKorean ? '🚀 GlobalSell AI: 당신의 글로벌 이커머스 리스팅 리포트' : '🚀 GlobalSell AI: Your Global E-commerce Listing Report';
    const title = isKorean ? '글로벌 리스팅 리포트' : 'Global Listing Report';

    const escapeHtml = (str: string): string =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const formattedReport = report.split('\n').map((line: string) => {
      if (line.startsWith('# ')) return `<h1 style="color: #10b981; font-size: 24px; margin-bottom: 16px;">${escapeHtml(line.substring(2))}</h1>`;
      if (line.startsWith('## ')) return `<h2 style="color: #ffffff; font-size: 20px; margin-top: 24px; margin-bottom: 12px;">${escapeHtml(line.substring(3))}</h2>`;
      if (line.startsWith('### ')) return `<h3 style="color: #ffffff; font-size: 18px; margin-top: 20px; margin-bottom: 10px;">${escapeHtml(line.substring(4))}</h3>`;
      if (line.startsWith('- ') || line.startsWith('* ')) return `<li style="color: #d1d5db; margin-bottom: 8px;">${escapeHtml(line.substring(2))}</li>`;
      if (!line.trim()) return '<br/>';
      return `<p style="color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">${escapeHtml(line)}</p>`;
    }).join('');

    const htmlContent = `
      <div style="background-color: #0f172a; color: #ffffff; padding: 40px; font-family: sans-serif; max-width: 600px; margin: 0 auto; border-radius: 20px;">
        <h1 style="text-align: center; color: #10b981; margin-bottom: 30px;">GlobalSell AI</h1>
        <div style="background-color: #1e293b; padding: 30px; border-radius: 15px; border: 1px solid #334155;">
          <h2 style="margin-top: 0; color: #ffffff;">${title}</h2>
          <div style="margin-top: 20px;">
            ${formattedReport}
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
          © 2026 GlobalSell AI. Scale your business worldwide with AI.
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GlobalSell AI <reports@buzzstyle.work>', // Ensure domain is verified in Resend
        to: email,
        subject: subject,
        html: htmlContent,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('Email API Error:', data);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Email API Server Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
