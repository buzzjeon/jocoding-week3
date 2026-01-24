interface Env {
  POLAR_ACCESS_TOKEN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Get origin from request body (sent by frontend)
    const body = await request.json().catch(() => ({})) as { origin?: string };
    const origin = body.origin || new URL(request.url).origin;
    const successUrl = `${origin}/?payment=success`;

    const response = await fetch('https://sandbox-api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: ['4da76d3a-45ee-4f2d-a5cc-d9e5183cd38c'],
        success_url: successUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Checkout 생성 실패',
        details: data.detail || JSON.stringify(data)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      url: data.url,
      id: data.id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
