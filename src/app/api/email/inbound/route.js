import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORWARD_TO = 'brent@3psolutions.ca';
const FORWARD_FROM = 'TwoBall Darts <login@twoballdarts.com>';
const ALLOWED_RECIPIENTS = new Set([
  'login@twoballdarts.com',
  'info@twoballdarts.com',
  'brent@twoballdarts.com',
  'sales@twoballdarts.com',
]);

function normalizeAddress(value = '') {
  const bracketedAddress = value.match(/<([^>]+)>/);
  return (bracketedAddress?.[1] || value).trim().toLowerCase();
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.error('Resend inbound email environment is not configured.');
    return NextResponse.json({ error: 'Email forwarding is unavailable.' }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const payload = await request.text();

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('Rejected a Resend webhook with missing signature headers.');
    return NextResponse.json(
      { error: 'Missing webhook signature headers.' },
      { status: 400 },
    );
  }

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    });
  } catch (error) {
    console.warn('Rejected an invalid Resend webhook signature.', error);
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ received: true });
  }

  const eventRecipients = [
    ...(event.data.to || []),
    ...(event.data.received_for || []),
  ].map(normalizeAddress);
  const matchedRecipient = eventRecipients.find((address) => ALLOWED_RECIPIENTS.has(address));

  if (!matchedRecipient) {
    console.warn('Ignored inbound email for an unapproved TwoBall address.');
    return NextResponse.json({ received: true, forwarded: false });
  }

  const { data: email, error: emailError } = await resend.emails.receiving.get(
    event.data.email_id,
  );

  if (emailError || !email) {
    console.error('Unable to retrieve the inbound email from Resend.', emailError);
    return NextResponse.json({ error: 'Unable to retrieve email.' }, { status: 502 });
  }

  const { data: attachmentList, error: attachmentError } =
    await resend.emails.receiving.attachments.list({ emailId: event.data.email_id });

  if (attachmentError) {
    console.error('Unable to retrieve inbound email attachments.', attachmentError);
    return NextResponse.json({ error: 'Unable to retrieve attachments.' }, { status: 502 });
  }

  const attachments = await Promise.all(
    (attachmentList?.data || []).map(async (attachment) => {
      const response = await fetch(attachment.download_url);
      if (!response.ok) {
        throw new Error(`Unable to download attachment ${attachment.id}.`);
      }

      return {
        filename: attachment.filename || 'attachment',
        content: Buffer.from(await response.arrayBuffer()),
        contentType: attachment.content_type,
        contentId: attachment.content_id,
      };
    }),
  );

  const contextText = `TwoBall address: ${matchedRecipient}\nOriginal sender: ${email.from}\n\n`;
  const contextHtml = `<p><strong>TwoBall address:</strong> ${escapeHtml(matchedRecipient)}<br><strong>Original sender:</strong> ${escapeHtml(email.from)}</p><hr>`;

  const { error: sendError } = await resend.emails.send(
    {
      from: FORWARD_FROM,
      to: FORWARD_TO,
      replyTo: email.reply_to?.length ? email.reply_to : email.from,
      subject: `[${matchedRecipient}] ${email.subject || '(no subject)'}`,
      text: `${contextText}${email.text || 'This message contains HTML content.'}`,
      html: `${contextHtml}${email.html || `<pre>${escapeHtml(email.text || '')}</pre>`}`,
      attachments,
    },
    { idempotencyKey: `twoball-inbound-${event.data.email_id}` },
  );

  if (sendError) {
    console.error('Unable to forward the inbound TwoBall email.', sendError);
    return NextResponse.json({ error: 'Unable to forward email.' }, { status: 502 });
  }

  return NextResponse.json({ received: true, forwarded: true });
}
