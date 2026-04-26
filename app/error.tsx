'use client'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ background: '#0a1628', color: 'white', fontFamily: 'monospace', padding: '2rem' }}>
        <h2 style={{ color: '#f87171' }}>Server Error</h2>
        <p style={{ color: '#94a3b8' }}>{error.message}</p>
        {error.digest && <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Digest: {error.digest}</p>}
      </body>
    </html>
  )
}
