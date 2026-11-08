/**
 * birthdayTemplates.js
 *
 * Professional birthday message templates for Sparsh Salon & Spa.
 * Clean, warm, elegant greetings free from excessive emojis and decorative symbols.
 *
 * Supported placeholders:
 * - {customerName}     : Customer's first name or full name (fallback: "Valued Client")
 * - {discountPercent}  : Discount percentage (e.g. "20")
 * - {offerValidity}    : Validity duration (e.g. "7 days")
 * - {salonName}        : Salon name ("Sparsh Salon & Spa")
 * - {salonPhone}       : Salon booking contact number
 */

export const DEFAULT_OFFER_CONFIG = {
  salonName: 'Sparsh Salon & Spa',
  salonPhone: '+91 99642 10706',
  discountPercent: 20,
  validityDays: 7,
};

export const BIRTHDAY_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Birthday Wish',
    description: 'Timeless, warm salon birthday greeting with birthday discount offer.',
    template: `Happy Birthday, {customerName}!

Wishing you a wonderful birthday from {salonName}.

Enjoy {discountPercent}% OFF on selected salon and hair care services. This offer is valid for {offerValidity}.

We look forward to welcoming you!
Appointments: {salonPhone}`,
  },
  {
    id: 'special',
    name: 'Special Birthday Offer',
    description: 'Celebratory invitation highlighting salon treatments and exclusive voucher.',
    template: `Happy Birthday, {customerName}!

Warmest greetings from {salonName} on your special occasion.

We are delighted to offer you {discountPercent}% OFF across our salon and spa treatments, valid for {offerValidity}.

To schedule your appointment, kindly call or WhatsApp us at {salonPhone}.`,
  },
  {
    id: 'premium',
    name: 'Premium Birthday Treat',
    description: 'Refined greeting inviting the customer for a luxury salon session.',
    template: `Happy Birthday, {customerName}!

{salonName} wishes you joy, health, and radiance in the year ahead.

As a birthday treat, please enjoy an exclusive {discountPercent}% discount on our premium styling and skincare packages. This offer is valid for {offerValidity}.

Please contact {salonPhone} to reserve your visit. We look forward to seeing you!`,
  },
  {
    id: 'short',
    name: 'Short & Sweet',
    description: 'Concise and direct greeting designed for quick WhatsApp notifications.',
    template: `Happy Birthday, {customerName}!

Wishing you a wonderful day from {salonName}.

Enjoy {discountPercent}% OFF on your next visit, valid for {offerValidity}.

Call {salonPhone} to book today. We look forward to welcoming you!`,
  },
];

/**
 * Replaces all placeholders in a template with actual customer and offer data.
 */
export function populateTemplate(templateString, customer = {}, config = DEFAULT_OFFER_CONFIG) {
  if (!templateString) return '';

  const rawName = customer.fName || customer.fullName || 'Valued Client';
  const customerName = rawName.trim();
  const discountPercent = config.discountPercent || 20;
  const validity = `${config.validityDays || 7} days`;
  const salonName = config.salonName || 'Sparsh Salon & Spa';
  const salonPhone = config.salonPhone || '+91 99642 10706';

  return templateString
    .replace(/\{customerName\}/g, customerName)
    .replace(/\{discountPercent\}/g, discountPercent)
    .replace(/\{offerValidity\}/g, validity)
    .replace(/\{salonName\}/g, salonName)
    .replace(/\{salonPhone\}/g, salonPhone);
}
