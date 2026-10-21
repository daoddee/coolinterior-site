'use strict';
const crypto = require('node:crypto');
const {sanitize}=require('../assets/campaign-core');
const STAGES = ['New', 'Contacted', 'Site visit', 'Quoted', 'Won', 'Lost'];
const PRIORITIES = ['Normal', 'High'];
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function text(value, max, required = false) {
  if (typeof value !== 'string') { if (required) throw new HttpError(400, 'Please complete the required fields.'); return ''; }
  const result = value.trim();
  if (result.length > max || (required && !result)) throw new HttpError(400, 'Please check the length of your enquiry fields.');
  return result;
}
function validateEnquiry(body) {
  if (!Array.isArray(body.services)) throw new HttpError(400, 'Choose a valid service.');
  const services = [...new Set(body.services)];
  if (!services.length || services.length > 4 || services.some(s => !['Tiling','Marble','Interior design','Natural stone installation'].includes(s))) throw new HttpError(400, 'Choose a valid service.');
  const name = text(body.name, 100, true), location = text(body.location, 80, true), details = text(body.details, 2000, true);
  if (name.length < 2 || location.length < 2 || details.length < 10) throw new HttpError(400, 'Please provide your name, location and project details.');
  const email = text(body.email, 160), phone = text(body.phone, 30);
  if (!email && !phone) throw new HttpError(400, 'Provide an email address or phone number.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Check your email address.');
  if (phone && (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g,'').length < 7 || phone.replace(/\D/g,'').length > 15)) throw new HttpError(400, 'Check your phone number.');
  if (!/^[a-f0-9-]{36}$/i.test(body.requestId || '')) throw new HttpError(400, 'Refresh the page and try again.');
  return { name, location, details, email, phone, services, property: text(body.property,80), timeframe: text(body.timeframe,100), budget: text(body.budget,100), source: text(body.source,200), attribution: sanitize(body.attribution), request_id: body.requestId };
}
function safeEqual(a,b) { const aa=Buffer.from(a),bb=Buffer.from(b); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
function sign(payload, secret) { const data=Buffer.from(JSON.stringify(payload)).toString('base64url'); return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url'); }
function verify(token, secret, now=Date.now()) {
  try { const [data,sig,...rest]=token.split('.'); if(rest.length || !safeEqual(crypto.createHmac('sha256',secret).update(data).digest('base64url'),sig)) return false;
    const p=JSON.parse(Buffer.from(data,'base64url')); return p.role==='owner' && p.exp>now && p.exp<=now+9*60*60*1000;
  } catch { return false; }
}
function verifyPassword(password, encoded) {
  try { const [salt,hash]=encoded.split(':'); if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hash)) return false;
    return safeEqual(crypto.scryptSync(password,salt,64).toString('hex'),hash); } catch { return false; }
}
module.exports={STAGES,PRIORITIES,HttpError,text,validateEnquiry,safeEqual,sign,verify,verifyPassword};
