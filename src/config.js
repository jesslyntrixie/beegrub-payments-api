import 'dotenv/config';

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value === true || value === 'true' || value === '1';
};

export const config = {
  port: process.env.PORT || 4000,
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
    isProduction: toBool(process.env.MIDTRANS_IS_PRODUCTION, false),
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

export const validateEnv = () => {
  const missing = [];
  if (!config.midtrans.serverKey) missing.push('MIDTRANS_SERVER_KEY');
  if (!config.midtrans.clientKey) missing.push('MIDTRANS_CLIENT_KEY');
  if (!config.supabase.url) missing.push('SUPABASE_URL');
  if (!config.supabase.serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
};
