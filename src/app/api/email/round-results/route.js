import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FROM = 'TwoBall Darts <login@twoballdarts.com>';
const PLAY_URL = 'https://play.twoballdarts.com';
const SWAG_URL = process.env.TWOBALL_SWAG_URL || 'https://twoballdarts.com';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmt(score) {
  const value = Number(score) || 0;
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : String(value);
}

function completePlayer(row) {
  const holes = new Set((row.hole_scores || []).map(score => Number(score.hole_number)));
  return holes.size === 18;
}

function resultLine({ isWinner, isTiedWinner, winnerNames, deficit }) {
  if (isWinner && isTiedWinner) {
    return "A tie for the win. Nobody gets full bragging rights. That's probably for the best.";
  }
  if (isWinner) {
    return "You won. Everyone else gets to live with that until the rematch.";
  }
  const winner = winnerNames.join(' & ');
  const margin = deficit === 1 ? '1 point' : `${deficit} points`;
  if (deficit <= 2) return `${winner} got you by ${margin}. Painfully close still counts as a loss.`;
  return `${winner} beat you by ${margin}. That's going to get annoying.`;
}

function emailHtml({ recipientName, standings, winnerNames, bestScore, recipientScore }) {
  const isWinner = recipientScore === bestScore;
  const isTiedWinner = standings.filter(row => row.total_score === bestScore).length > 1;
  const deficit = Math.max(0, recipientScore - bestScore);
  const line = resultLine({ isWinner, isTiedWinner, winnerNames, deficit });

  const rows = standings.map((row, index) => {
    const winner = row.total_score === bestScore;
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #315447;color:#f5e8c6;">${index + 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #315447;color:#f5e8c6;font-weight:700;">${escapeHtml(row.display_name)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #315447;color:${winner ? '#d0a948' : '#f5e8c6'};font-weight:900;text-align:right;">${fmt(row.total_score)}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#02140f;color:#f5e8c6;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:28px 18px;">
        <div style="border:1px solid #315447;border-radius:18px;background:#042f23;padding:24px;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d0a948;font-weight:800;">TwoBall Darts</div>
          <h1 style="margin:8px 0 10px;font-size:34px;line-height:1;color:#fff4d6;">Round over, ${escapeHtml(recipientName)}.</h1>
          <p style="margin:0 0 18px;font-size:17px;line-height:1.5;color:#f5e8c6;">${escapeHtml(line)}</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;background:#02140f;border-radius:12px;overflow:hidden;">
            <thead>
              <tr>
                <th style="padding:10px 8px;text-align:left;color:#d0a948;">#</th>
                <th style="padding:10px 8px;text-align:left;color:#d0a948;">Player</th>
                <th style="padding:10px 8px;text-align:right;color:#d0a948;">Score</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin:18px 0 8px;font-size:15px;color:#f5e8c6;">The only reasonable response is a rematch.</p>
          <a href="${PLAY_URL}" style="display:block;text-align:center;background:#be1412;color:#fff4d6;text-decoration:none;font-weight:900;padding:14px 18px;border-radius:10px;margin:12px 0;">PLAY AGAIN</a>
          <a href="${SWAG_URL}" style="display:block;text-align:center;border:1px solid #d0a948;color:#d0a948;text-decoration:none;font-weight:900;padding:13px 18px;border-radius:10px;margin:12px 0 0;">TWOBALL SWAG</a>
        </div>
        <p style="margin:14px 4px 0;font-size:12px;line-height:1.4;color:#9bac9f;">No gimmes. Just throw.</p>
      </div>
    </body>
  </html>`;
}

function emailText({ recipientName, standings, winnerNames, bestScore, recipientScore }) {
  const isWinner = recipientScore === bestScore;
  const isTiedWinner = standings.filter(row => row.total_score === bestScore).length > 1;
  const deficit = Math.max(0, recipientScore - bestScore);
  const line = resultLine({ isWinner, isTiedWinner, winnerNames, deficit });
  const board = standings.map((row, index) => `${index + 1}. ${row.display_name}: ${fmt(row.total_score)}`).join('\n');

  return `Round over, ${recipientName}.

${line}

FINAL RESULTS
${board}

Play again: ${PLAY_URL}
TwoBall swag: ${SWAG_URL}

No gimmes. Just throw.`;
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!apiKey || !serviceRoleKey || !supabaseUrl || !publishableKey) {
    console.error('Post-game email environment is not fully configured.');
    return NextResponse.json({ error: 'Post-game email is not configured.' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const browserSupabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: authData, error: authError } = await browserSupabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const gameId = body?.gameId;
  if (!gameId) return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: game, error: gameError } = await adminSupabase
    .from('games')
    .select('id,title,played_at,course_name,status,owner_profile_id,results_email_sent_at,game_players(id,total_score,total_strokes,player_id,players(id,display_name,profile_id),hole_scores(hole_number))')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Round not found.' }, { status: 404 });
  }

  if (game.results_email_sent_at) {
    return NextResponse.json({ sent: 0, alreadySent: true });
  }

  const gamePlayers = game.game_players || [];
  if (!gamePlayers.length || !gamePlayers.every(completePlayer)) {
    return NextResponse.json({ error: 'Result emails are only sent for completed 18-hole rounds.' }, { status: 409 });
  }

  const { data: callerProfile } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  const callerIsParticipant = callerProfile?.id && gamePlayers.some(row => row.players?.profile_id === callerProfile.id);
  const callerOwnsGame = callerProfile?.id && game.owner_profile_id === callerProfile.id;
  if (!callerIsParticipant && !callerOwnsGame) {
    return NextResponse.json({ error: 'You are not authorized to send results for this round.' }, { status: 403 });
  }

  const standings = gamePlayers
    .map(row => ({
      display_name: row.players?.display_name || 'Player',
      profile_id: row.players?.profile_id || null,
      total_score: Number(row.total_score) || 0
    }))
    .sort((a, b) => a.total_score - b.total_score || a.display_name.localeCompare(b.display_name));

  const bestScore = standings[0]?.total_score ?? 0;
  const winnerNames = standings.filter(row => row.total_score === bestScore).map(row => row.display_name);
  const profileIds = [...new Set(standings.map(row => row.profile_id).filter(Boolean))];

  if (!profileIds.length) {
    return NextResponse.json({ sent: 0, skipped: 'No signed-in participants have email addresses.' });
  }

  const { data: profiles, error: profilesError } = await adminSupabase
    .from('profiles')
    .select('id,user_id,display_name')
    .in('id', profileIds);

  if (profilesError) {
    console.error('Unable to load participant profiles for result email.', profilesError);
    return NextResponse.json({ error: 'Unable to load participant profiles.' }, { status: 502 });
  }

  const recipients = (await Promise.all((profiles || []).map(async profile => {
    const { data, error } = await adminSupabase.auth.admin.getUserById(profile.user_id);
    if (error || !data?.user?.email) return null;
    const standing = standings.find(row => row.profile_id === profile.id);
    if (!standing) return null;
    return {
      profileId: profile.id,
      email: data.user.email,
      displayName: profile.display_name || standing.display_name,
      totalScore: standing.total_score
    };
  }))).filter(Boolean);

  if (!recipients.length) {
    return NextResponse.json({ sent: 0, skipped: 'No participant email addresses were available.' });
  }

  const resend = new Resend(apiKey);
  const failures = [];
  let sent = 0;

  for (const recipient of recipients) {
    const isWinner = recipient.totalScore === bestScore;
    const tied = winnerNames.length > 1;
    const subject = isWinner
      ? (tied ? 'You tied for the win. We will allow it.' : 'You won. Try not to be unbearable about it.')
      : `${winnerNames.join(' & ')} got the bragging rights. For now.`;

    const payload = {
      recipientName: recipient.displayName,
      standings,
      winnerNames,
      bestScore,
      recipientScore: recipient.totalScore
    };

    const { error } = await resend.emails.send(
      {
        from: FROM,
        to: recipient.email,
        replyTo: 'info@twoballdarts.com',
        subject,
        html: emailHtml(payload),
        text: emailText(payload)
      },
      { idempotencyKey: `twoball-results-${game.id}-${recipient.profileId}` }
    );

    if (error) {
      console.error('Unable to send TwoBall result email.', recipient.profileId, error);
      failures.push(recipient.profileId);
    } else {
      sent += 1;
    }
  }

  if (failures.length) {
    return NextResponse.json({ error: 'Some result emails could not be sent.', sent, failed: failures.length }, { status: 502 });
  }

  const { error: markError } = await adminSupabase
    .from('games')
    .update({ results_email_sent_at: new Date().toISOString() })
    .eq('id', game.id)
    .is('results_email_sent_at', null);

  if (markError) {
    console.error('Result emails sent, but delivery marker could not be saved.', markError);
  }

  return NextResponse.json({ sent, alreadySent: false });
}
