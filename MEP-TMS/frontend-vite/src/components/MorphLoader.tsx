import React from 'react';

interface MorphLoaderProps {
  text?: string;
  size?: number;        // SVG size in px, default 56
  fullPage?: boolean;   // centers in a full-page overlay
  minHeight?: string;   // e.g. '60vh' for section loaders
  inline?: boolean;     // tiny inline variant for buttons
}

/**
 * Maverick One — M Morph Loader
 * The path morphs between the M-shape and a collapsed vertical line,
 * adapting colour to light / dark mode via CSS variables.
 */
export default function MorphLoader({
  text,
  size = 56,
  fullPage = false,
  minHeight,
  inline = false,
}: MorphLoaderProps) {
  if (inline) {
    // Button-inline: simple spinning circle, no morph animation
    return (
      <>
        <style>{`
          @keyframes _btn-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span
          style={{
            display: 'inline-block',
            verticalAlign: 'middle',
            width: 16,
            height: 16,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: '_btn-spin 0.7s linear infinite',
            opacity: 0.85,
          }}
        />
      </>
    );
  }

  const wrapperStyle: React.CSSProperties = fullPage
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        zIndex: 9999,
        gap: 20,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: minHeight ?? '60vh',
        gap: 16,
        padding: '40px 0',
      };

  return (
    <div style={wrapperStyle}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        style={{ color: 'var(--loader-color, var(--powder-blue))' }}
      >
        <style>{`
          @keyframes _morph {
            0%,15%  { d: path("M10 54 L10 14 L32 40 L54 14 L54 54"); opacity: 1; }
            35%,50% { d: path("M32 14 L32 54 L32 54 L32 54 L32 54"); opacity: 0.4; }
            65%,80% { d: path("M10 54 L10 14 L32 40 L54 14 L54 54"); opacity: 1; }
            100%    { d: path("M10 54 L10 14 L32 40 L54 14 L54 54"); opacity: 1; }
          }
        `}</style>
        <path
          d="M10 54 L10 14 L32 40 L54 14 L54 54"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ animation: '_morph 2.4s ease-in-out infinite' }}
        />
      </svg>

      {text && (
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
            letterSpacing: '0.2px',
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
