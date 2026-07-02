import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function GET() {
  const icon = React.createElement(
    'div',
    {
      style: {
        width: 192,
        height: 192,
        background: '#02140f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    React.createElement(
      'div',
      {
        style: {
          width: 150,
          height: 150,
          borderRadius: 75,
          background: '#063927',
          border: '7px solid #d0a948',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      React.createElement('div', {
        style: {
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#f5e8c6'
        }
      })
    )
  );

  return new ImageResponse(icon, { width: 192, height: 192 });
}
