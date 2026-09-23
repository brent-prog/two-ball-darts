import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FROM = 'TwoBall Darts <login@twoballdarts.com>';
const TO = 'info@twoballdarts.com';

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgvjlykedwahxknkyhra.supabase.co';
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nKJ1AQ0YRzogBz4HbKvXPA_GBTRsNyt';

  if (!apiKey) {
    console.error('New-user notification is missing RESEND_API_KEY.');
    return NextResponse.json({ error: 'Notification email is not configured.' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const browserSupabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await browserSupabase.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const displayName = String(body?.displayName || '').trim();
  const username = String(body?.username || '').trim();

  const resend = new Resend(apiKey);
  const subject = `New TwoBall signup${displayName ? `: ${displayName}` : ''}`;
  const text = [
    'A new user signed up for TwoBall Darts.',
    '',
    displayName ? `Display name: ${displayName}` : null,
    username ? `Username: @${username}` : null,
    user.email ? `Email: ${user.email}` : null,
    `User ID: ${user.id}`,
    `Created: ${user.created_at || new Date().toISOString()}`
  ].filter(Boolean).join('\n');

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: TO,
      replyTo: user.email || TO,
      subject,
      text
    },
    { idempotencyKey: `twoball-new-user-${user.id}` }
  );

  if (error) {
    console.error('Unable to send new-user notification.', user.id, error);
    return NextResponse.json({ error: 'Notification could not be sent.' }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
