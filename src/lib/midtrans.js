import crypto from 'crypto';
import midtransClient from 'midtrans-client';
import { config } from '../config.js';

const snap = new midtransClient.Snap({
  isProduction: config.midtrans.isProduction,
  serverKey: config.midtrans.serverKey,
  clientKey: config.midtrans.clientKey,
});

export const createQrisTransaction = async ({ orderId, grossAmount, amount, customer, items = [] }) => {
  const finalAmount = grossAmount ?? amount;

  if (!finalAmount) {
    throw new Error('grossAmount (or amount) is required');
  }

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: finalAmount,
    },
    customer_details: {
      first_name: customer?.name || customer?.first_name || 'BeeGrub Student',
      last_name: customer?.last_name || '',
      email: customer?.email || 'student@beegrub.app',
      phone: customer?.phone || '+628123456789',
    },
    item_details: items.length > 0 ? items.map((item) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      name: item.name,
    })) : [{
      id: 'beegrub-order',
      price: finalAmount,
      quantity: 1,
      name: 'BeeGrub Order',
    }],
    enabled_payments: ['qris', 'shopeepay'],
    qris: {
      acquirer: ['shopeepay'],
    }
  };

  return snap.createTransaction(payload);
};

export const verifyNotificationSignature = ({ orderId, statusCode, grossAmount, signatureKey }) => {
  const rawSignature = `${orderId}${statusCode}${grossAmount}${config.midtrans.serverKey}`;
  const computed = crypto.createHash('sha512').update(rawSignature).digest('hex');
  return computed === signatureKey;
};
