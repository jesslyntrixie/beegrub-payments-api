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
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: finalAmount,
    },
    customer_details: {
      first_name: customer?.name || 'BeeGrub Student',
      email: customer?.email,
      phone: customer?.phone,
    },
    item_details: items.map((item) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      name: item.name,
    })),
    qris: {
      acquirer: 'gopay',
    },
    custom_field1: 'BeeGrub QRIS',
  };

  return snap.createTransaction(payload);
};

export const verifyNotificationSignature = ({ orderId, statusCode, grossAmount, signatureKey }) => {
  const rawSignature = `${orderId}${statusCode}${grossAmount}${config.midtrans.serverKey}`;
  const computed = crypto.createHash('sha512').update(rawSignature).digest('hex');
  return computed === signatureKey;
};
