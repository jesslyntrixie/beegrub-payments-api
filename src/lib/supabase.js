import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const markPaymentStatus = async ({ orderId, status, paidAt = null, gatewayResponse = {} }) => {
  if (!orderId) return;

  // Update payments table
  await supabaseAdmin
    .from('payments')
    .update({
      status,
      paid_at: paidAt,
      gateway_response: gatewayResponse,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);

  // Update orders table (optional: only for completed states)
  if (status === 'completed') {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', orderId);
  }
};
