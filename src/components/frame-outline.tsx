export function FrameOutline({shape="rectangular"}:{shape?:"rectangular"|"round"|"cat-eye"}) {
  return <svg viewBox="0 0 320 150" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
      {shape==="round" ? <><ellipse cx="88" cy="78" rx="54" ry="49"/><ellipse cx="232" cy="78" rx="54" ry="49"/></> : shape==="cat-eye" ? <><path d="M25 44Q75 29 141 59L132 97Q104 129 56 104Q33 91 25 44Z"/><path d="M295 44Q245 29 179 59L188 97Q216 129 264 104Q287 91 295 44Z"/></> : <><path d="M29 48Q77 36 141 50L136 97Q132 115 91 115Q49 115 40 98Z"/><path d="M291 48Q243 36 179 50L184 97Q188 115 229 115Q271 115 280 98Z"/></>}
      <path d="M141 64Q160 51 179 64M29 52L12 49M291 52L308 49" strokeLinecap="round"/>
    </g><path d="M58 60L104 52M206 57L249 54" stroke="white" strokeWidth="3" strokeLinecap="round" opacity=".6"/>
  </svg>;
}
