type SupabaseEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type SupabaseRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export const supabaseRequest = async (
  env: SupabaseEnv,
  path: string,
  options: SupabaseRequestOptions = {}
) => {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || response.statusText);
  }

  return data;
};
