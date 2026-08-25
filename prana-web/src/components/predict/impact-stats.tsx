const stats = [
  { value: "847", label: "Projects" },
  { value: "623", label: "Organizations" },
  { value: "734", label: "Ecosystems\nProtected" },
  { value: "28M+", label: "tCO₂e\nImpacted" },
];

export default function ImpactStats() {
  return (
    <section
      className="relative w-full py-16 px-6 overflow-hidden"
      style={{
        background: "linear-gradient(90deg, #0283B3 28.37%, #63B371 90.87%)",
        minHeight: "500px",
      }}
    >
      {/* Dotted world map overlay */}
      <div className="absolute top-0 left-0 right-0 h-[55%] bg-[url('/map-impact-stats.png')] bg-center bg-no-repeat bg-cover opacity-20" />

      <div className="relative z-10 max-w-[1200px] mx-auto flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-12"> 
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Creating Impact Across The Country
          </h2>
          <p className="text-sm text-white/80 max-w-[460px] mx-auto leading-relaxed">
            Our solutions help organizations, governments and communities build
            a resilient and sustainable planet.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-[900px]">
          {stats.map((s) => (
            <div
              key={s.value}
              className="rounded-2xl p-6 md:p-8 flex flex-col justify-end"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
            >
              <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                {s.value}
              </p>
              <p className="text-xs text-white/80 whitespace-pre-line leading-snug">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}