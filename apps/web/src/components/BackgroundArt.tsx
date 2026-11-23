export function BackgroundArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[#090b12]">
      <div className="absolute inset-0 scale-105 bg-[url('/bg-road.webp')] bg-cover bg-center opacity-90" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,18,0.55)_0%,rgba(9,11,18,0.2)_40%,rgba(9,11,18,0.5)_80%,rgba(9,11,18,0.85)_100%)]" />
    </div>
  );
}
