import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const font = await fetch(`${origin}/brand/barlow-condensed-900.woff2`).then(response => response.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '1600px',
          height: '560px',
          display: 'flex',
          alignItems: 'center',
          background: 'transparent',
          fontFamily: 'Barlow Condensed'
        }}
      >
        <img
          src={`${origin}/brand/twoball-mark.svg`}
          width="560"
          height="500"
          style={{ objectFit: 'contain', marginLeft: '20px' }}
        />
        <div
          style={{
            marginLeft: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            lineHeight: 0.86
          }}
        >
          <div style={{ fontSize: '220px', fontWeight: 900, letterSpacing: '-4px', color: '#F4EFE2' }}>
            TWO BALL
          </div>
          <div style={{ marginTop: '42px', fontSize: '205px', fontWeight: 900, letterSpacing: '7px', color: '#EF0014' }}>
            DARTS
          </div>
        </div>
      </div>
    ),
    {
      width: 1600,
      height: 560,
      fonts: [
        {
          name: 'Barlow Condensed',
          data: font,
          weight: 900,
          style: 'normal'
        }
      ]
    }
  );
}
