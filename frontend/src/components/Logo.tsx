import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: boolean;
  stacked?: boolean; // emblem above the text (for login/register)
}

export const Logo: React.FC<LogoProps> = ({ size = 40, showText = true, subtitle = false, stacked = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: stacked ? '8px' : '10px',
        textAlign: stacked ? 'center' : 'left',
      }}
    >
      <img src="/logo-mark.png" width={size} height={size} alt="DevGuardian logo" style={{ display: 'block' }} />

      {showText && (
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: `${Math.round(size * (stacked ? 0.5 : 0.45))}px`, fontWeight: 700, letterSpacing: '-0.01em' }}>
            <span style={{ color: 'var(--text)' }}>Dev</span>
            <span style={{ color: 'var(--accent)' }}>Guardian</span>
          </div>
          {subtitle && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
              {stacked ? 'Scan · Protect · Stay Secure' : 'AI Engineering Agent'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};