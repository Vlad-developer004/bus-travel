const FLAGS: Record<string, React.ReactNode> = {
  uk: (
    <>
      <rect width="60" height="20" fill="#0057b7" />
      <rect y="20" width="60" height="20" fill="#ffd700" />
    </>
  ),
  de: (
    <>
      <rect width="60" height="13.4" fill="#000" />
      <rect y="13.3" width="60" height="13.4" fill="#dd0000" />
      <rect y="26.6" width="60" height="13.4" fill="#ffce00" />
    </>
  ),
  pl: (
    <>
      <rect width="60" height="20" fill="#fff" />
      <rect y="20" width="60" height="20" fill="#dc143c" />
    </>
  ),
  en: (
    <>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="7" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="2.4" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="7" />
    </>
  ),
};

export function Flag({ code, className = 'size-8' }: { code: string; className?: string }) {
  return (
    <span className={`inline-grid shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(13,18,32,0.14)] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" className="size-full">
        {FLAGS[code] ?? <rect width="60" height="40" fill="#888" />}
      </svg>
    </span>
  );
}
