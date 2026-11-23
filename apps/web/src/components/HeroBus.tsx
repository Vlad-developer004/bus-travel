export function HeroBus({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 680 290" className={className} aria-hidden="true">
      <defs>
        <clipPath id="bus-body">
          <path d="M40 78a34 34 0 0 1 34-34h476a60 60 0 0 1 60 60v108a18 18 0 0 1-18 18H58a18 18 0 0 1-18-18Z" />
        </clipPath>
        <linearGradient id="bus-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#25396f" />
          <stop offset="1" stopColor="#0f1a3d" />
        </linearGradient>
      </defs>
      <ellipse cx="340" cy="262" rx="310" ry="13" fill="#0b1030" opacity="0.35" />
      <rect x="196" y="28" width="150" height="16" rx="8" fill="#e4e8f5" />
      <g clipPath="url(#bus-body)">
        <rect x="30" y="30" width="640" height="210" fill="#ffffff" />
        <rect x="30" y="168" width="640" height="46" fill="#ffd23f" />
        <rect x="30" y="204" width="640" height="14" fill="#1b2a5e" />
        <path d="M30 150 L330 150 L300 168 L30 168Z" fill="#3352ff" opacity="0.12" />
      </g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={70 + i * 78} y="62" width="66" height="68" rx="14" fill="url(#bus-glass)" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${82 + i * 78} 74 l30 0 l-22 44 l-14 0Z`} fill="#fff" opacity="0.1" />
      ))}
      <path d="M536 62h30a30 30 0 0 1 32 28v40h-62Z" fill="url(#bus-glass)" />
      <rect x="520" y="140" width="4" height="64" rx="2" fill="#cfd5e6" />
      <rect x="596" y="176" width="14" height="20" rx="7" fill="#fff3b0" />
      <circle cx="160" cy="226" r="46" fill="#0a1030" />
      <circle cx="500" cy="226" r="46" fill="#0a1030" />
      {[160, 500].map((x) => (
        <g key={x}>
          <circle cx={x} cy="226" r="34" fill="#1d2448" />
          <circle cx={x} cy="226" r="19" fill="#dfe4f3" />
          <circle cx={x} cy="226" r="6" fill="#8d97b6" />
        </g>
      ))}
    </svg>
  );
}
