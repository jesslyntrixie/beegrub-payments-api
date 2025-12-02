import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { config, validateEnv } from './config.js';
import { createQrisTransaction, verifyNotificationSignature } from './lib/midtrans.js';
import { markPaymentStatus } from './lib/supabase.js';

validateEnv();

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/payments/qris', async (req, res) => {
    const { orderId, amount, customer = {}, description = 'BeeGrub order' } = req.body || {};

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }

    try {
      const transaction = await createQrisTransaction({ orderId, amount, customer, description });
      res.json({ transaction });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed creating QRIS transaction', error);
      res.status(502).json({ 
        error: 'Unable to create payment at the moment.',
        details: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  app.post('/webhooks/midtrans', async (req, res) => {
    const {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
    } = req.body || {};

    if (!orderId || !signatureKey) {
      return res.status(400).json({ error: 'Invalid notification payload' });
    }

    const isValidSignature = verifyNotificationSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
    });

    if (!isValidSignature) {
      return res.status(403).json({ error: 'Signature mismatch' });
    }

    const normalizedStatus = (() => {
      if (transactionStatus === 'capture' && fraudStatus === 'challenge') return 'pending';
      if (['capture', 'settlement'].includes(transactionStatus) && fraudStatus !== 'deny') return 'completed';
      if (transactionStatus === 'pending') return 'pending';
      if (['expire', 'cancel', 'deny'].includes(transactionStatus)) return 'failed';
      return 'unknown';
    })();

    try {
      await markPaymentStatus({
        orderId,
        status: normalizedStatus,
        paidAt: normalizedStatus === 'completed' ? new Date().toISOString() : null,
        gatewayResponse: req.body,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update payment status in Supabase', error);
      return res.status(500).json({ error: 'Failed to persist payment status' });
    }

    res.json({ received: true });
  });

  // Demo-only endpoint: simulate successful payment without calling Midtrans.
  // Useful for university presentations or local testing without real money.
  app.post('/demo/payments/complete', async (req, res) => {
    const { orderId } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    try {
      await markPaymentStatus({
        orderId,
        status: 'completed',
        paidAt: new Date().toISOString(),
        gatewayResponse: { source: 'demo-payments-complete' },
      });

      res.json({ ok: true, orderId, status: 'completed' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to simulate payment completion', error);
      res.status(500).json({ error: 'Failed to complete demo payment' });
    }
  });

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  const port = config.port;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`BeeGrub Payments API listening on port ${port}`);
  });
}
export default createApp();