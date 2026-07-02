import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function GET() {
  const icon = React.createElement('div', {
    style: {
      width: 512,
      height: 512,
      background: '#02140f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f5e8c6',
      fontSize: 96,
      fontWeight: 900,
      fontFamily: 'Arial, Helvetica, sans-serif'
    }
  }, 'TBD');

  return new ImageResponse(icon, { width: 512, height: 512 });
}
