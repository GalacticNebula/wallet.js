import crypto from 'crypto';

export function sign(args: any, secret: string) {
  const keys = Object.keys(args).sort();
  const text = keys.map((k) => k + '=' + args[k]).join('&');
  return crypto.createHmac('sha256', secret).update(text).digest('base64');
}
