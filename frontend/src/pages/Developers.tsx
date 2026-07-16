import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Code2, Star, Users } from 'lucide-react';

const developers = [
  { name: 'Arun S',       initials: 'AS', hue: 250 },
  { name: 'Aakash',       initials: 'AK', hue: 200 },
  { name: 'Abhinaya',     initials: 'AB', hue: 160 },
  { name: 'Achaya',       initials: 'AC', hue: 130 },
  { name: 'Ajay',         initials: 'AJ', hue: 30  },
  { name: 'Arun Kumar',   initials: 'AR', hue: 310 },
  { name: 'Azriel Dino',  initials: 'AD', hue: 180 },
  { name: 'B. Vaishnavi', initials: 'BV', hue: 340 },
  { name: 'Balamurugan',  initials: 'BM', hue: 270 },
  { name: 'Boopalan',     initials: 'BP', hue: 50  },
];

interface DevCardProps {
  name: string;
  initials: string;
  hue: number;
  index: number;
}

const DevCard: React.FC<DevCardProps> = ({ name, initials, hue, index }) => {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const grad = `linear-gradient(135deg, hsl(${hue},78%,52%) 0%, hsl(${(hue+45)%360},88%,64%) 100%)`;
  const glow = `hsl(${hue},78%,52%)`;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? hovered ? 'translateY(-12px) scale(1.05)' : 'translateY(0) scale(1)'
          : 'translateY(36px) scale(0.95)',
        transitionProperty: 'opacity, transform, box-shadow',
        transitionDuration: hovered ? '0.25s' : '0.6s',
        transitionTimingFunction: 'ease',
        transitionDelay: hovered ? '0s' : `${index * 0.08}s`,
        boxShadow: hovered
          ? `0 24px 60px -8px ${glow}60, 0 0 0 1.5px ${glow}40`
          : '0 4px 20px -4px rgba(0,0,0,0.12)',
      }}
      className="relative flex flex-col items-center gap-5 rounded-2xl p-8 cursor-default select-none
        bg-white/75 dark:bg-slate-900/65
        border border-slate-200/60 dark:border-slate-700/40
        backdrop-blur-lg overflow-hidden"
    >
      {/* Glow overlay */}
      <div
        style={{ background: grad, opacity: hovered ? 0.12 : 0, transition: 'opacity 0.3s' }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
      />

      {/* Blurred orb behind avatar */}
      <div
        style={{ background: grad, filter: 'blur(28px)', opacity: hovered ? 0.5 : 0.22, transition: 'opacity 0.3s', width: 80, height: 80 }}
        className="absolute top-5 rounded-full pointer-events-none"
      />

      {/* Avatar stack */}
      <div className="relative z-10" style={{ width: 68, height: 68 }}>
        {/* Spinning conic ring */}
        <div
          style={{
            position: 'absolute', inset: -4, borderRadius: 20,
            background: `conic-gradient(from 0deg, ${glow}, transparent 55%, ${glow})`,
            opacity: hovered ? 1 : 0,
            animation: hovered ? 'dev-ring-spin 1.6s linear infinite' : 'none',
            transition: 'opacity 0.3s',
          }}
        />
        {/* White gap ring */}
        <div
          style={{
            position: 'absolute', inset: -1, borderRadius: 17,
            background: 'white',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
          className="dark:!bg-slate-950"
        />
        {/* Main avatar circle */}
        <div
          style={{ background: grad, borderRadius: 16, width: '100%', height: '100%' }}
          className="relative z-10 flex items-center justify-center shadow-lg"
        >
          <span className="text-xl font-black text-white drop-shadow">{initials}</span>
        </div>
      </div>

      {/* Name */}
      <div className="relative z-10 text-center">
        <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {name}
        </p>
        <p style={{ color: glow }} className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-85">
          MCA · Developer
        </p>
      </div>

      {/* Star row */}
      <div className="relative z-10 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            style={{
              color: glow, fill: glow,
              opacity: hovered ? 1 : 0.4,
              transform: hovered ? 'scale(1.25)' : 'scale(1)',
              transition: `opacity 0.2s ${i * 0.05}s, transform 0.2s ${i * 0.05}s`,
            }}
            className="h-3 w-3"
          />
        ))}
      </div>

      {/* Bottom pill */}
      <div
        style={{ background: grad, opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }}
        className="absolute bottom-0 inset-x-0 h-0.5 rounded-b-2xl pointer-events-none"
      />
    </div>
  );
};

export const Developers: React.FC = () => {
  return (
    <div className="space-y-10 pb-6">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-10 text-center"
        style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)' }}
      >
        <div className="absolute -top-12 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm border border-white/20">
            <GraduationCap className="h-4 w-4" />
            Master of Computer Applications
          </div>
          <h1 className="text-4xl font-black text-white drop-shadow-xl tracking-tight">
            Meet Our Developers
          </h1>
          <p className="mt-2 text-lg text-white/75 font-medium">
            The brilliant minds behind{' '}
            <span className="font-extrabold text-white">budgetIQ</span>
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-10">
            {[
              { icon: Users, label: 'Developers', value: '10' },
              { icon: Code2, label: 'Project', value: 'budgetIQ' },
              { icon: Star, label: 'Batch', value: 'MCA 2026 – 28' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="mx-auto mb-1 h-5 w-5 text-white/65" />
                <p className="text-xl font-extrabold text-white">{value}</p>
                <p className="text-[11px] uppercase tracking-widest text-white/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Developer grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {developers.map((dev, i) => (
          <DevCard key={dev.name} {...dev} index={i} />
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-600">
        Built with ❤️ by the MCA team &nbsp;·&nbsp; budgetIQ © 2026 – 2028
      </p>

      {/* Keyframe */}
      <style>{`
        @keyframes dev-ring-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
