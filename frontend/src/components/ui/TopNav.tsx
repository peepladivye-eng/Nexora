import { useEffect, useState } from 'react';

const NAV_TABS = [
  { id: 'live', label: 'Live View' },
  { id: 'debris', label: 'Debris Tracking' },
  { id: 'risk', label: 'Risk Analysis' },
  { id: 'missions', label: 'Missions' },
  { id: 'about', label: 'About' },
];

function formatISTDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${month} ${day}, ${year} / ${hh}:${mm}:${ss} IST`;
}

function toIST(d: Date): Date {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const istMs = utcMs + 5.5 * 3600_000;
  return new Date(istMs);
}

function TopNav() {
  const [activeTab, setActiveTab] = useState<string>('live');
  const [search, setSearch] = useState<string>('');
  const [now, setNow] = useState<Date>(() => toIST(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(toIST(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="glass fixed top-0 z-30 w-full h-14 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.55)]">
          <span className="text-white text-lg leading-none">◉</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-white tracking-[0.18em] text-sm">ORBITGUARD</span>
          <span className="text-[10px] text-white/50 tracking-[0.24em]">TRACK · PREDICT · PROTECT</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm text-white/70 hover:text-white transition-colors ${
                isActive ? 'nav-underline text-white' : ''
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search satellites, debris..."
            className="glass-sm rounded-full w-64 h-9 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-sky-400/50 transition-colors"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 text-sm">🔍</span>
        </div>
        <div className="text-xs text-white/70 font-mono tabular-nums tracking-wide">
          {formatISTDate(now)}
        </div>
      </div>
    </nav>
  );
}

export default TopNav;
