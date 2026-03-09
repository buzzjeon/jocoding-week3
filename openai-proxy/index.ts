export interface Env {
  OPENAI_API_KEY: string;
  PROXY_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const proxySecret = request.headers.get('X-Proxy-Secret');
    if (!proxySecret || proxySecret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const openaiPath = url.pathname.replace(/^\/openai/, '');
    const openaiUrl = `https://api.openai.com${openaiPath}`;

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${env.OPENAI_API_KEY}`);
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);

    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers,
      body: request.body,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
