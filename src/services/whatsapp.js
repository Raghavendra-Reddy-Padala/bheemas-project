import axios from "axios";

const META_API_URL = "https://graph.facebook.com/v21.0";

/**
 * Get configured axios instance for Meta API calls.
 * Creates a fresh instance each call to always use current env values.
 */
function getMetaClient() {
  return axios.create({
    baseURL: META_API_URL,
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
}

/**
 * Format phone number to international format (India default).
 * Strips non-digits, prepends 91 if 10-digit Indian number.
 */
function formatPhone(mobile) {
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("+91")) return digits;
  return digits;
}

/**
 * Send a WhatsApp template message via Meta Cloud API.
 *
 * @param {string} phone - Recipient phone number
 * @param {string} templateName - Meta-approved template name
 * @param {string} languageCode - Template language code
 * @param {Array} components - Template components (header, body params, buttons etc.)
 * @returns {Promise<object>} Meta API response
 */
export async function sendTemplateMessage(phone, templateName, languageCode = "en", components = []) {
  const formattedPhone = formatPhone(phone);
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  // Only add components if there are any
  if (components.length > 0) {
    payload.template.components = components;
  }

  try {
    const client = getMetaClient();
    const res = await client.post(`/${phoneNumberId}/messages`, payload);

    console.log(`✅ WhatsApp sent to ${formattedPhone} [${templateName}] ${res.data?.messages} `);
    return { success: true, messageId: res.data?.messages?.[0]?.id, phone: formattedPhone };
  } catch (err) {
    const errorData = err.response?.data?.error || err.message;
    console.error(`❌ WhatsApp failed for ${formattedPhone} [${templateName}]:`, errorData);
    return { success: false, error: errorData, phone: formattedPhone };
  }
}

/**
 * Send membership invoice/welcome message.
 *
 * Template: membership_invoice
 * Expected template body parameters:
 *   {{1}} = member name
 *   {{2}} = plan name
 *   {{3}} = join date
 *   {{4}} = expiry date
 *   {{5}} = total amount
 *   {{6}} = paid amount
 *   {{7}} = bill link
 */
export async function sendInvoiceMessage(member) {
  const billUrl = `${process.env.FRONTEND_BILL_URL}/${member.id}`;

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: member.name },
        { type: "text", text: member.plan },
        { type: "text", text: member.joinDate },
        { type: "text", text: member.expiryDate },
        { type: "text", text: `₹${member.totalAmount}` },
        { type: "text", text: `₹${member.paidAmount}` },
        { type: "text", text: billUrl },
      ],
    },
  ];

  return sendTemplateMessage(member.mobile, "membership_invoice", "en", components);
}

/**
 * Send expiry reminder message.
 *
 * Uses different templates based on urgency:
 * - 7 days: expiry_reminder_week
 * - 1 day:  expiry_reminder_day
 *
 * Expected template body parameters:
 *   {{1}} = member name
 *   {{2}} = expiry date
 *   {{3}} = days remaining
 *   {{4}} = plan name
 */
export async function sendExpiryReminder(member, daysLeft) {
  const templateName = daysLeft <= 1 ? "expiry_reminder_day" : "expiry_reminder_week";

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: member.name },
        { type: "text", text: member.expiryDate },
        { type: "text", text: String(Math.max(0, daysLeft)) },
        { type: "text", text: member.plan },
      ],
    },
  ];

  return sendTemplateMessage(member.mobile, templateName, "en", components);
}

/**
 * Send a campaign/promotional message.
 *
 * Template: campaign_message
 * Expected template body parameters:
 *   {{1}} = member name
 *   {{2}} = campaign title
 *   {{3}} = campaign body/description
 */
export async function sendCampaignMessage(phone, memberName, campaignTitle, campaignBody) {
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: memberName },
        { type: "text", text: campaignTitle },
        { type: "text", text: campaignBody },
      ],
    },
  ];

  return sendTemplateMessage(phone, "campaign_message", "en", components);
}

/**
 * Send bulk messages with rate limiting to avoid Meta API throttling.
 * Processes messages sequentially with a delay between each.
 *
 * @param {Array<{phone: string, name: string}>} recipients
 * @param {string} campaignTitle
 * @param {string} campaignBody
 * @param {function} onProgress - Callback with (sent, total, result)
 * @returns {Promise<{sent: number, failed: number, results: Array}>}
 */
export async function sendBulkCampaign(recipients, campaignTitle, campaignBody, onProgress) {
  const results = [];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const { phone, name } = recipients[i];

    const result = await sendCampaignMessage(phone, name, campaignTitle, campaignBody);
    results.push(result);

    if (result.success) sent++;
    else failed++;

    if (onProgress) onProgress(i + 1, recipients.length, result);

    // Rate limit: ~80 msgs/sec is Meta's limit, we use conservative 200ms gap
    if (i < recipients.length - 1) {
      await sleep(200);
    }
  }

  return { sent, failed, total: recipients.length, results };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
