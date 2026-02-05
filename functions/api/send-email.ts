interface Env {
  RESEND_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { email, report, hairstyleImage, lang } = await request.json();

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

    // 리포트를 HTML로 변환
    const reportHtml = report
      .split('\n')
      .map((line: string) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return `<h2 style="color: #13c8ec; margin-top: 24px; margin-bottom: 12px; font-size: 18px;">${line.replace(/\*\*/g, '')}</h2>`;
        }
        if (line.startsWith('- ')) {
          return `<li style="color: #e0e0e0; margin: 4px 0;">${line.substring(2)}</li>`;
        }
        if (line.trim() === '') {
          return '<br/>';
        }
        return `<p style="color: #e0e0e0; margin: 8px 0; line-height: 1.6;">${line}</p>`;
      })
      .join('');

    // 헤어스타일 이미지 섹션
    const hairstyleSection = hairstyleImage ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;">
        <h2 style="color: #13c8ec; margin-bottom: 16px; font-size: 18px;">
          ${isKorean ? '추천 헤어스타일' : 'Recommended Hairstyles'}
        </h2>
        <img src="${hairstyleImage}" alt="Recommended hairstyles" style="width: 100%; max-width: 500px; border-radius: 12px;" />
      </div>
    ` : '';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ffffff; font-size: 28px; margin: 0;">
            Style<span style="color: #13c8ec;">AI</span>
          </h1>
          <p style="color: #888; margin-top: 8px;">
            ${isKorean ? 'AI 기반 퍼스널 스타일링' : 'AI-Powered Personal Styling'}
          </p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #333;">
          <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 24px; text-align: center;">
            ${isKorean ? '스타일 리포트' : 'Your Style Report'}
          </h2>

          <div style="color: #e0e0e0;">
            ${reportHtml}
          </div>

          ${hairstyleSection}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #333;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            ${isKorean ? '이 이메일은 StyleAI에서 발송되었습니다.' : 'This email was sent by StyleAI.'}
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 8px;">
            <a href="https://jocoding-week3.pages.dev" style="color: #13c8ec; text-decoration: none;">
              ${isKorean ? '웹사이트 방문하기' : 'Visit our website'}
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Resend API로 이메일 전송
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StyleAI <onboarding@resend.dev>',
        to: [email],
        subject: isKorean ? '[StyleAI] 스타일 리포트가 도착했습니다' : '[StyleAI] Your Style Report is Ready',
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
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
