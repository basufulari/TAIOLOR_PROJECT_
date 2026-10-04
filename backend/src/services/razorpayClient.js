const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

let triedDotenvFallback = false;

function ensureEnvLoaded() {
  if (triedDotenvFallback) return;
  triedDotenvFallback = true;

  // Fallback: if the server didn't load .env for any reason, try loading it here.
  // Expected location: backend/.env (two levels up from this file).
  const envPath = path.join(__dirname, '..', '..', '.env');
  dotenv.config({ path: envPath });
}

function getRazorpayAuth() {
  ensureEnvLoaded();
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.RZP_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RZP_KEY_SECRET || '';

  if (!keyId || !keySecret) {
    const err = new Error(
      `Razorpay keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env (cwd: ${process.cwd()})`
    );
    err.status = 500;
    throw err;
  }

  const basic = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return { keyId, header: `Basic ${basic}` };
}

function razorpayApi() {
  const { header } = getRazorpayAuth();
  return axios.create({
    baseURL: 'https://api.razorpay.com/v1',
    timeout: 20000,
    headers: { Authorization: header },
  });
}

async function createPaymentLink({
  amountInr,
  referenceId,
  description,
  customerName,
  customerEmail,
  customerContact,
}) {
  const api = razorpayApi();

  const amountPaise = Math.round(Number(amountInr || 0) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    const err = new Error('Invalid amount for Razorpay payment link');
    err.status = 400;
    throw err;
  }

  const payload = {
    amount: amountPaise,
    currency: 'INR',
    reference_id: referenceId,
    description: description || 'AI Tailor order payment',
    customer: {
      name: customerName || 'Customer',
      email: customerEmail || undefined,
      contact: customerContact || undefined,
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
  };

  // Remove undefined fields (Razorpay rejects some undefined keys)
  if (!payload.customer.email) delete payload.customer.email;
  if (!payload.customer.contact) delete payload.customer.contact;

  const { data } = await api.post('/payment_links', payload);
  return data;
}

async function fetchPaymentLink(paymentLinkId) {
  const api = razorpayApi();
  const { data } = await api.get(`/payment_links/${paymentLinkId}`);
  return data;
}

module.exports = {
  getRazorpayAuth,
  createPaymentLink,
  fetchPaymentLink,
};

