const REQUIRED = ['DATABASE_URL', 'WEB_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'TICKET_SECRET'];
const SECRETS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'TICKET_SECRET'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((k) => !config[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

  for (const k of SECRETS) {
    if (String(config[k]).length < 32) throw new Error(`${k} must be at least 32 characters`);
  }

  const provider = config.PAYMENT_PROVIDER ?? 'mock';
  if (provider === 'stripe' && !(config.STRIPE_SECRET_KEY && config.STRIPE_WEBHOOK_SECRET)) {
    throw new Error('PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET');
  }
  if (config.NODE_ENV === 'production' && provider === 'mock') {
    throw new Error('PAYMENT_PROVIDER=mock is not allowed in production');
  }
  if (config.NODE_ENV === 'production' && /change-me/.test(SECRETS.map((k) => config[k]).join(' '))) {
    throw new Error('Default placeholder secrets must not be used in production');
  }
  return config;
}
