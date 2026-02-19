import { getClientIp, rateLimit, verifyAntiBotToken } from './_antibot';

interface Env {
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  ANTI_BOT_SECRET: string;
}

const allowedOrigins = [
  'https://brandforge.buzzstyle.work',
  'https://www.brandforge.buzzstyle.work',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const getCorsHeaders = (origin: string | null) => {
  const isPreview = origin ? origin.endsWith('.cloudworkstations.dev') : false;
  if (!origin || (!allowedOrigins.includes(origin) && !isPreview)) {
    return null;
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-AntiBot-Token',
    'Vary': 'Origin',
  };
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`send-email:${ip}`, 5, 60_000);
    if (!limiter.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: limiter.retryAfter }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limiter.retryAfter),
          ...corsHeaders,
        },
      });
    }

    if (!env.ANTI_BOT_SECRET) {
      return new Response(JSON.stringify({ error: 'Security configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const antiBotToken = request.headers.get('X-AntiBot-Token');
    if (!antiBotToken || !(await verifyAntiBotToken(env.ANTI_BOT_SECRET, ip, antiBotToken))) {
      return new Response(JSON.stringify({ error: 'Invalid anti-bot token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { email, report, marketingVisual, lang } = await request.json();

    if (!email || !report) {
      return new Response(JSON.stringify({ error: '이메일과 리포트가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: '유효한 이메일 주소를 입력해주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const isKorean = lang === 'ko';

    const escapeHtml = (str: string): string =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const getSectionEmoji = (title: string) => {
      const t = title.toLowerCase();
      if (t.includes('positioning') || t.includes('포지셔닝')) return '🎯';
      if (t.includes('visual') || t.includes('비주얼') || t.includes('시각')) return '🎨';
      if (t.includes('typography') || t.includes('타이포')) return '🔤';
      if (t.includes('tone') || t.includes('톤') || t.includes('voice') || t.includes('보이스')) return '🗣️';
      if (t.includes('competitive') || t.includes('경쟁')) return '⚔️';
      if (t.includes('platform') || t.includes('플랫폼')) return '📱';
      return '✅';
    };

    const formatParagraph = (text: string) =>
      `<p style=\"color: #e9e9e9; margin: 10px 0; line-height: 1.7; font-size: 15px;\">${escapeHtml(text)}</p>`;

    // 리포트를 HTML로 변환 (섹션/리스트/강조 처리)
    const lines = report.split(/\\r?\\n/);
    let inList = false;
    const htmlParts: string[] = [];
    lines.forEach((rawLine: string) => {
        const line = rawLine.trim();
        if (!line) {
          if (inList) {
            inList = false;
            htmlParts.push('</ul><div style=\"height: 8px;\"></div>');
            return;
          }
          htmlParts.push('<div style=\"height: 8px;\"></div>');
          return;
        }

        const isBoldHeading = line.startsWith('**') && line.endsWith('**');
        const isNumberedHeading = /^\\d+\\./.test(line);
        if (isBoldHeading || isNumberedHeading) {
          const title = escapeHtml(line.replace(/\\*\\*/g, '').replace(/^\\d+\\.\\s*/, ''));
          if (inList) {
            inList = false;
            htmlParts.push(`</ul><h2 style=\"color: #ffffff; margin-top: 26px; margin-bottom: 12px; font-size: 18px; letter-spacing: 0.2px;\">
              <span style=\"display: inline-flex; align-items: center; gap: 8px;\">
                <span style=\"font-size: 18px;\">${getSectionEmoji(title)}</span>
                <span>${title}</span>
              </span>
            </h2>`);
            return;
          }
          htmlParts.push(`<h2 style=\"color: #ffffff; margin-top: 26px; margin-bottom: 12px; font-size: 18px; letter-spacing: 0.2px;\">
            <span style=\"display: inline-flex; align-items: center; gap: 8px;\">
              <span style=\"font-size: 18px;\">${getSectionEmoji(title)}</span>
              <span>${title}</span>
            </span>
          </h2>`);
          return;
        }

        if (line.startsWith('- ') || line.startsWith('• ')) {
          if (!inList) {
            inList = true;
            htmlParts.push(`<ul style=\"margin: 6px 0 12px; padding: 12px 16px; background: #141414; border: 1px solid #2c2c2c; border-radius: 12px; list-style: none;\">
              <li style=\"color: #e0e0e0; margin: 6px 0; line-height: 1.6; font-size: 14.5px;\">${escapeHtml(line.substring(2))}</li>`);
            return;
          }
          htmlParts.push(`<li style=\"color: #e0e0e0; margin: 6px 0; line-height: 1.6; font-size: 14.5px;\">${escapeHtml(line.substring(2))}</li>`);
          return;
        }

        if (inList) {
          inList = false;
          htmlParts.push(`</ul>${formatParagraph(line)}`);
          return;
        }

        if (line.startsWith('TIP:') || line.startsWith('팁:')) {
          htmlParts.push(`<div style=\"margin: 12px 0; padding: 12px 14px; background: #0f1f22; border: 1px solid #1f5f6b; border-radius: 12px; color: #cbeff6; font-size: 14px;\">
            💡 ${escapeHtml(line.replace(/^TIP:\\s*|^팁:\\s*/i, ''))}
          </div>`);
          return;
        }

        htmlParts.push(formatParagraph(line));
      });
    if (inList) {
      htmlParts.push('</ul>');
    }
    const reportHtml = htmlParts.join('');

    // 마케팅 비주얼 이미지 섹션 - data: URI만 허용하여 외부 URL 주입 방지
    const safeMarketingVisual = marketingVisual && typeof marketingVisual === 'string'
      && marketingVisual.startsWith('data:image/') ? marketingVisual : null;
    const marketingVisualSection = safeMarketingVisual ? `
      <div style=\"margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;\">
        <h2 style=\"color: #6C63FF; margin-bottom: 16px; font-size: 18px;\">
          ${isKorean ? '마케팅 비주얼' : 'Marketing Visual'}
        </h2>
        <img src=\"${safeMarketingVisual}\" alt=\"Marketing Visual\" style=\"width: 100%; max-width: 500px; border-radius: 12px;\" />
      </div>
    ` : '';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset=\"utf-8\">
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    </head>
    <body style=\"margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\">
      <div style=\"max-width: 600px; margin: 0 auto; padding: 40px 20px;\">
        <!-- Header -->
        <div style=\"text-align: center; margin-bottom: 32px;\">
          <h1 style=\"color: #ffffff; font-size: 28px; margin: 0;\">
            Brand<span style=\"color: #6C63FF;\">Forge</span> AI
          </h1>
          <p style=\"color: #888; margin-top: 8px;\">
            ${isKorean ? 'AI 기반 브랜드 전략' : 'AI-Powered Brand Strategy'}
          </p>
        </div>

        <!-- Main Content -->
        <div style=\"background-color: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #333;\">
          <h2 style=\"color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 24px; text-align: center;\">
            ${isKorean ? '브랜드 리포트' : 'Your Brand Report'}
          </h2>

          <div style=\"color: #e0e0e0;\">
            ${reportHtml}
          </div>

          ${marketingVisualSection}
        </div>

        <!-- Footer -->
        <div style=\"text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;\">
          <p style=\"color: #666; font-size: 12px; margin: 0;\">
            ${isKorean ? '이 이메일은 BrandForge AI에서 발송되었습니다.' : 'This email was sent by BrandForge AI.'}
          </p>
          <p style=\"color: #666; font-size: 12px; margin-top: 8px;\">
            <a href=\"https://brandforge.buzzstyle.work\" style=\"color: #6C63FF; text-decoration: none;\">
              ${isKorean ? '웹사이트 방문하기' : 'Visit our website'}
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    if (!env.RESEND_FROM) {
      return new Response(JSON.stringify({ error: 'RESEND_FROM is not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Resend API로 이메일 전송
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: email,
        subject: isKorean ? '[BrandForge AI] 브랜드 리포트가 도착했습니다' : '[BrandForge AI] Your Brand Report is Ready',
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return new Response(JSON.stringify({
        error: isKorean ? '이메일 전송에 실패했습니다.' : 'Failed to send email.',
        details: data.message || JSON.stringify(data),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: isKorean ? '이메일이 전송되었습니다!' : 'Email sent successfully!',
      id: data.id,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Send email error:', error);
    return new Response(JSON.stringify({
      error: '서버 오류가 발생했습니다.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
