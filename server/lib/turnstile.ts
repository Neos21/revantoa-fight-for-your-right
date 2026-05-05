type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

export async function verifyTurnstile(secret: string, token: string, remoteIp: string): Promise<boolean> {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if(remoteIp !== 'unknown') form.set('remoteip', remoteIp);
  
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form
  });
  
  if(!response.ok) return false;
  
  const result = await response.json<TurnstileVerifyResponse>();
  return result.success;
}

