import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FROM = 'TwoBall Darts <login@twoballdarts.com>';
const PLAY_URL = 'https://play.twoballdarts.com';
const LOGO_URL = `${PLAY_URL}/twoball-email-logo-v5.webp`;
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

const COPY = {
  soloWinner: {
    nailbiter: {
      subjects: ['By ONE.', 'You got away with one.', 'Bragging rights. Barely.', 'One point. Beautiful.', 'That was close.'],
      lines: ['You won by {margin}. That’s gonna piss them off.', 'One point. Beautiful.', 'By 1. Don’t explain. Just take the win.', 'You got away with one.', 'Won by 1. They’ll have excuses.'],
      rematches: ['Run it back.', 'Again.', 'Settle it.', 'You know what to do.', 'Rematch. Obviously.']
    },
    close: {
      subjects: ['Nice round.', 'Bragging rights.', 'You got it done.', 'That’ll do.', 'Close. Yours.'],
      lines: ['Nice win. Not a lot of room for shit-talking...but enough.', 'You won. They didn’t. That’s really all that matters.', 'Solid. Annoyingly solid.', 'Close enough to be fun. Far enough to count.', 'You’ve got the bragging rights. Use them irresponsibly.'],
      rematches: ['Again.', 'Run it back.', 'One more?', 'You know what to do.', 'Do it again. We dare you.']
    },
    blowout: {
      subjects: ['That got ugly.', 'Well...shit.', 'You kicked their ass.', 'Not particularly close.', 'Maybe buy the next round.'],
      lines: ['You kicked their ass a little.', 'Well...that wasn’t particularly close.', 'Comfortable win. Feel free to be a dick about it.', 'They’re gonna want another shot at you.', 'You won. Pretty handily, actually.', 'Jesus. Save some dignity for the other guys.', 'Well...you kicked the shit out of them.', 'That got ugly. For them.', 'You could at least pretend it was close.', 'Maybe buy the next round.'],
      rematches: ['Again?', 'Run it back.', 'Give them another shot.', 'Do it again. We dare you.', 'Rematch. Obviously.']
    }
  },
  loser: {
    nailbiter: {
      subjects: ['By ONE.', 'Ouch.', 'Well, shit.', 'That one hurts.', 'Run it back.'],
      lines: ['You lost by 1. That’s gonna bug you.', 'One point. Fuck.', 'By 1. You know exactly which dart you want back.', 'That one hurts.', 'One lousy point. Run it back.'],
      rematches: ['Run it back.', 'Again.', 'Don’t leave it like that.', 'Fuck that. Play again.', 'Rematch. Obviously.']
    },
    close: {
      subjects: ['Close. Still lost.', 'Ouch.', 'Run it back.', 'Almost.', 'Well, shit.'],
      lines: ['Close. Still lost.', 'You were right there. Which somehow makes it worse.', 'Not terrible. Not a win either.', 'A couple darts go differently and you’re insufferable right now.', 'Close enough that you probably have an excuse ready.'],
      rematches: ['Run it back.', 'Again.', 'Go get your money back.', 'Don’t leave it like that.', 'You know what to do.']
    },
    blowout: {
      subjects: ['That got ugly.', 'Ouch.', 'Well, shit.', 'You got smoked.', 'Maybe delete this.'],
      lines: ['Yeah...you got beat.', 'Not your best work.', 'You’re gonna want that one back.', 'They got you pretty good.', 'Could’ve been worse. Could’ve been better too.', 'Jesus. What happened?', 'You got your ass kicked.', 'Maybe we don’t talk about this round.', 'Good news: nobody got hurt.', 'We saved the scorecard. Sorry.'],
      rematches: ['Run it back.', 'Again.', 'Fuck that. Play again.', 'Go get your money back.', 'Do it again. We dare you.']
    }
  },
  tiedWinner: {
    subjects: ['Nobody won.', 'A tie? Nope.', 'Well, that settled nothing.', 'Run it back.', 'Fucking useless.'],
    lines: ['A tie. Fucking useless.', 'Nobody won. Do it again.', 'A tie? Nope. Run it back.', 'Well that settled nothing.', 'Shared bragging rights are not bragging rights.'],
    rematches: ['Run it back.', 'Again.', 'Settle it.', 'Fuck that. Play again.', 'Rematch. Obviously.']
  }
};

function stableIndex(seed, length, salt = '') {
  let hash = 2166136261;
  const input = `${seed}:${salt}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function pickCopy(items, seed, salt) {
  return items[stableIndex(seed, items.length, salt)];
}

function fillCopy(value, { winner, margin }) {
  return value.replaceAll('{winner}', winner).replaceAll('{margin}', margin);
}

function resultCopy({ gameId, recipientKey, isWinner, isTiedWinner, winnerNames, deficit, winningMargin }) {
  const winner = winnerNames.join(' & ');
  const relevantMargin = isWinner ? winningMargin : deficit;
  const margin = relevantMargin === 1 ? '1 point' : `${relevantMargin} points`;
  const bucket = relevantMargin <= 1 ? 'nailbiter' : relevantMargin <= 4 ? 'close' : 'blowout';
  const group = isTiedWinner ? COPY.tiedWinner : (isWinner ? COPY.soloWinner[bucket] : COPY.loser[bucket]);
  const seed = `${gameId}:${recipientKey}:${bucket}`;
  return {
    subject: fillCopy(pickCopy(group.subjects, seed, 'subject'), { winner, margin }),
    line: fillCopy(pickCopy(group.lines, seed, 'line'), { winner, margin }),
    rematch: fillCopy(pickCopy(group.rematches, seed, 'rematch'), { winner, margin })
  };
}

function emailHtml({ recipientName, standings, winnerNames, bestScore, recipientScore, copy }) {
  const line = copy.line;

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
    <head>
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light only">
      <style>
        :root { color-scheme: light only; supported-color-schemes: light only; }
        body, table, td { font-family: Arial, Helvetica, sans-serif; }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#02140f;background-image:linear-gradient(#02140f,#02140f);color:#f5e8c6;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#02140f" style="width:100%;background:#02140f;background-image:linear-gradient(#02140f,#02140f);">
        <tr>
          <td align="center" style="padding:28px 14px;background:#02140f;background-image:linear-gradient(#02140f,#02140f);">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#042f23" style="width:100%;max-width:600px;border:1px solid #315447;border-radius:18px;background:#042f23;background-image:linear-gradient(#042f23,#042f23);">
              <tr>
                <td style="padding:28px 24px 24px;">
                  <div style="text-align:center;margin:0 0 24px;">
                    <img src="${LOGO_URL}" alt="Two Ball Darts" width="320" style="display:inline-block;width:320px/;max-width:90%;height:auto;border:0;outline:none;text-decoration:none;" />
                  </div>
                  <div style="height:1px;background:#315447;margin:0 0 22px;"></div>
                  <div style="font-size:12px;letter-spacing:2.4px;text-transform:uppercase;color:#d0a948;font-weight:900;">Final Results</div>
                  <h1 style="margin:8px 0 12px;font-size:34px;line-height:1.05;color:#fff4d6;font-weight:900;">Round over, ${escapeHtml(recipientName)}.</h1>
                  <p style="margin:0 0 20px;font-size:17px;line-height:1.5;color:#f5e8c6;">${escapeHtml(line)}</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#02140f" style="width:100%;border-collapse:collapse;margin:20px 0;background:#02140f;background-image:linear-gradient(#02140f,#02140f);border:1px solid #315447;border-radius:12px;overflow:hidden;">
                    <thead>
                      <tr>
                        <th style="padding:11px 9px;text-align:left;color:#d0a948;background:#063927;background-image:linear-gradient(#063927,#063927);">#</th>
                        <th style="padding:11px 9px;text-align:left;color:#d0a948;background:#063927;background-image:linear-gradient(#063927,#063927);">Player</th>
                        <th style="padding:11px 9px;text-align:right;color:#d0a948;background:#063927;background-image:linear-gradient(#063927,#063927);">Score</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>
                  <p style="margin:18px 0 8px;font-size:15px;color:#f5e8c6;">${escapeHtml(copy.rematch)}</p>
                  <a href="${PLAY_URL}" style="display:block;text-align:center;background:#be1412;background-image:linear-gradient(#be1412,#be1412);color:#fff4d6;text-decoration:none;font-weight:900;padding:14px 18px;border-radius:10px;margin:12px 0;">PLAY AGAIN</a>
                  <a href="${SWAG_URL}" style="display:block;text-align:center;border:1px solid #d0a948;color:#d0a948;text-decoration:none;font-weight:900;padding:13px 18px;border-radius:10px;margin:12px 0 0;">TWOBALL SWAG</a>
                  <div style="height:1px;background:#315447;margin:24px 0 14px;"></div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td valign="middle" style="font-family:'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif;font-size:14px;line-height:1;letter-spacing:1.1px;text-transform:uppercase;color:#d0a948;font-weight:900;white-space:nowrap;">Keep Fun Simple</td>
                      <td align="right" valign="middle"><a href="https://rockpail.com" style="text-decoration:none;"><img src="${PLAY_URL}/rockpail-production-white-footer.png" alt="A RockPail Production" width="132" style="display:inline-block;width:132px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;background:transparent;" /></a></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function emailText({ recipientName, standings, winnerNames, bestScore, recipientScore, copy }) {
  const line = copy.line;
  const board = standings.map((row, index) => `${index + 1}. ${row.display_name}: ${fmt(row.total_score)}`).join('\n');

  return `Round over, ${recipientName}.

${line}

FINAL RESULTS
${board}

${copy.rematch}

Play again: ${PLAY_URL}
TwoBall swag: ${SWAG_URL}

Keep Fun Simple`;
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgvjlykedwahxknkyhra.supabase.co';
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nKJ1AQ0YRzogBz4HbKvXPA_GBTRsNyt';

  if (!apiKey) {
    console.error('Post-game email environment is missing RESEND_API_KEY.');
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

  const authedSupabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: recipientRows, error: recipientsError } = await authedSupabase.rpc(
    'get_round_result_email_recipients',
    { p_game_id: gameId }
  );

  if (recipientsError) {
    const message = recipientsError.message || 'Unable to load round result recipients.';
    if (/not authorized/i.test(message)) {
      return NextResponse.json({ error: 'You are not authorized to send results for this round.' }, { status: 403 });
    }
    if (/not complete/i.test(message)) {
      return NextResponse.json({ error: 'Result emails are only sent for completed 18-hole rounds.' }, { status: 409 });
    }
    console.error('Unable to load round result recipients.', recipientsError);
    return NextResponse.json({ error: 'Unable to load round result recipients.' }, { status: 502 });
  }

  const rows = recipientRows || [];
  if (!rows.length) {
    return NextResponse.json({ sent: 0, skipped: 'No signed-in participants have email addresses.' });
  }

  if (rows[0].results_email_sent_at) {
    return NextResponse.json({ sent: 0, alreadySent: true });
  }

  const standings = rows
    .map(row => ({
      display_name: row.display_name || 'Player',
      profile_id: row.profile_id,
      total_score: Number(row.total_score) || 0
    }))
    .sort((a, b) => a.total_score - b.total_score || a.display_name.localeCompare(b.display_name));

  const bestScore = standings[0]?.total_score ?? 0;
  const winnerNames = standings.filter(row => row.total_score === bestScore).map(row => row.display_name);

  const recipients = rows
    .filter(row => row.profile_id && row.email)
    .map(row => ({
      profileId: row.profile_id,
      email: row.email,
      displayName: row.display_name || 'Player',
      totalScore: Number(row.total_score) || 0
    }));

  if (!recipients.length) {
    return NextResponse.json({ sent: 0, skipped: 'No signed-in participants have email addresses.' });
  }

  const resend = new Resend(apiKey);
  const failures = [];
  let sent = 0;

  for (const recipient of recipients) {
    const isWinner = recipient.totalScore === bestScore;
    const tied = winnerNames.length > 1;
    const runnerUpScore = standings.find(row => row.total_score > bestScore)?.total_score ?? bestScore;
    const winningMargin = Math.max(0, runnerUpScore - bestScore);
    const deficit = Math.max(0, recipient.totalScore - bestScore);
    const copy = resultCopy({
      gameId,
      recipientKey: recipient.profileId || recipient.email,
      isWinner,
      isTiedWinner: isWinner && tied,
      winnerNames,
      deficit,
      winningMargin
    });
    const subject = copy.subject;

    const payload = {
      recipientName: recipient.displayName,
      standings,
      winnerNames,
      bestScore,
      recipientScore: recipient.totalScore,
      copy
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
      { idempotencyKey: `twoball-results-${gameId}-${recipient.profileId}` }
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

  const { error: markError } = await authedSupabase.rpc(
    'mark_round_results_emailed',
    { p_game_id: gameId }
  );

  if (markError) {
    console.error('Result emails sent, but delivery marker could not be saved.', markError);
  }

  return NextResponse.json({ sent, alreadySent: false });
}
