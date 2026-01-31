interface Env {
  POLAR_ACCESS_TOKEN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await request.json().catch(() => ({})) as {
      origin?: string;
      userId?: string;
      email?: string;
    };

    const origin = body.origin || new URL(request.url).origin;
    const successUrl = `${origin}/?subscription=success`;

    // StyleAI Daily Premium subscription product ID
    const SUBSCRIPTION_PRODUCT_ID = '50ac0439-8520-47e8-a496-25a96d7a56b3';

    const checkoutData: Record<string, unknown> = {
      products: [SUBSCRIPTION_PRODUCT_ID],
      success_url: successUrl,
    };

    // Link to user if provided
    if (body.userId) {
      checkoutData.external_customer_id = body.userId;
    }

    // Pre-fill email if provided
    if (body.email) {
      checkoutData.customer_email = body.email;
    }

    const response = await fetch('https://sandbox-api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Subscription checkout failed',
        details: data.detail || JSON.stringify(data)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      url: data.url,
      id: data.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
