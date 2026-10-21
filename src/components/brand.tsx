// Both views display the unmodified original logo; only its transparent margins are framed.
export function Brand() {
  return <span className="brand-mark">
    <svg className="brand-symbol" viewBox="136 174 350 160" aria-hidden="true"><image href="/brand/logo-original.png" width="640" height="640" /></svg>
    <span className="brand-lockup"><svg className="brand-wordmark" viewBox="55 434 525 60" role="img" aria-label="Óptica Global"><image href="/brand/logo-original.png" width="640" height="640" /></svg><span className="brand-tagline">Visión sin fronteras</span></span>
  </span>;
}
