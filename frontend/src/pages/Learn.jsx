import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const LESSONS = [
  {
    id: 'momentum',
    title: 'Momentum Trading',
    level: 'Beginner',
    readTime: '5 min',
    icon: 'MT',
    summary: 'Learn why strong trends can persist, how breakouts differ from noise, and how momentum agents follow the tape.',
    bullets: ['Trend continuation', 'Moving-average structure', 'Breakout confirmation'],
    sections: [
      {
        heading: 'What momentum means',
        body: 'Momentum strategies assume assets that are already moving strongly tend to keep moving until the trend weakens. The goal is not to predict bottoms or tops, but to align with the strongest part of a move.',
      },
      {
        heading: 'How the platform agent uses it',
        body: 'Our Momentum Agent looks at trend persistence, relative strength, and moving-average structure. It prefers liquid symbols where price direction is supported by participation and not just random spikes.',
      },
    ],
  },
  {
    id: 'mean-reversion',
    title: 'Mean Reversion',
    level: 'Intermediate',
    readTime: '6 min',
    icon: 'MR',
    summary: 'Study how temporary overreaction creates snap-back opportunities and where the strategy breaks down in true regime shifts.',
    bullets: ['Price extremes', 'Z-score logic', 'Reversion windows'],
    sections: [
      {
        heading: 'The core idea',
        body: 'Mean reversion fades stretched moves when price deviates too far from normal behavior. It is strongest when markets are range-bound and weaker when a real trend is just beginning.',
      },
      {
        heading: 'How the agent filters noise',
        body: 'The platform checks how extreme the move is relative to recent volatility. Instead of blindly buying every dip, it scores whether the move is likely to be exhaustion versus a genuine breakdown.',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Management',
    level: 'Essential',
    readTime: '7 min',
    icon: 'RM',
    summary: 'This is the lesson that keeps every other lesson alive. Learn position sizing, drawdowns, and capital preservation.',
    bullets: ['Position sizing', 'Drawdown control', 'Stop logic'],
    sections: [
      {
        heading: 'Why it matters most',
        body: 'A strategy only matters if you survive long enough to apply it repeatedly. Risk management protects the account from one bad sequence undoing dozens of good decisions.',
      },
      {
        heading: 'What the platform enforces',
        body: 'The Risk Manager agent sits above directional agents and can reduce or reject trades when exposure, volatility, or drawdown exceed safe limits.',
      },
    ],
  },
  {
    id: 'factor',
    title: 'Factor Investing',
    level: 'Advanced',
    readTime: '8 min',
    icon: 'FI',
    summary: 'Explore how value, quality, momentum, and low-volatility characteristics can be combined into a systematic stock selection process.',
    bullets: ['Composite scoring', 'Quality and value', 'Systematic ranking'],
    sections: [
      {
        heading: 'What a factor is',
        body: 'A factor is a measurable characteristic associated with returns over time. Investors rank securities across these characteristics to build a more repeatable decision process.',
      },
      {
        heading: 'How the platform uses it',
        body: 'Our Factor Model Agent blends style signals into a composite score so users can see which symbols are attractive on more than one dimension at the same time.',
      },
    ],
  },
];

function DifficultyBadge({ level }) {
  const tone = {
    Beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Intermediate: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    Essential: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Advanced: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  }[level] || 'text-zinc-400 bg-zinc-800 border-zinc-700';

  return <span className={`rounded-full border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.24em] ${tone}`}>{level}</span>;
}

function LessonCard({ lesson, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(lesson)}
      className={`rounded-[26px] border p-5 text-left transition-all ${
        active ? 'border-cyan-500/45 bg-cyan-500/8' : 'border-zinc-800 bg-zinc-900/55 hover:border-zinc-700 hover:bg-zinc-900/80'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-mono text-cyan-300">
          {lesson.icon}
        </div>
        <DifficultyBadge level={lesson.level} />
      </div>
      <h3 className="mt-5 text-xl font-light text-zinc-100">{lesson.title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-500">{lesson.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {lesson.bullets.map((bullet) => (
          <span key={bullet} className="rounded-full border border-zinc-800 bg-zinc-950/55 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
            {bullet}
          </span>
        ))}
      </div>
      <div className="mt-5 text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-600">{lesson.readTime} read</div>
    </button>
  );
}

function LessonDetail({ lesson }) {
  return (
    <div className="panel p-6 lg:p-7">
      <div className="panel-title">
        <span>{lesson.title}</span>
        <span className="text-[10px] font-mono text-zinc-600">{lesson.readTime}</span>
      </div>
      <div className="space-y-6">
        {lesson.sections.map((section) => (
          <div key={section.heading}>
            <h3 className="text-xl font-light text-zinc-100">{section.heading}</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{section.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/dashboard" className="btn-primary text-center">Watch on dashboard</Link>
        <Link to="/markets/AAPL" className="btn-ghost text-center">Practice on a market page</Link>
      </div>
    </div>
  );
}

export default function Learn() {
  const [active, setActive] = useState(LESSONS[0]);

  const trackSummary = useMemo(
    () => [
      { label: 'Tracks', value: `${LESSONS.length}`, sub: 'Structured strategy lessons' },
      { label: 'Difficulty', value: 'Beginner to Advanced', sub: 'Start simple and level up' },
      { label: 'Focus', value: 'Execution + reasoning', sub: 'Understand why agents act' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="section-kicker mb-3">Learning hub</div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">
              Learn the logic behind the trades before you put even fake capital to work.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              AgenticTrading is a learning platform first. Every lesson is tied to how the platform's agents think, filter setups, and respond to risk.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {trackSummary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 p-4">
                  <div className="section-kicker mb-2">{item.label}</div>
                  <div className="text-lg text-zinc-100">{item.value}</div>
                  <div className="mt-1 text-xs text-zinc-500">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] border border-zinc-800/80 bg-zinc-950/45 p-5">
            <div className="panel-title"><span>Suggested path</span></div>
            <div className="space-y-3">
              {LESSONS.map((lesson, index) => (
                <div key={lesson.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/45 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-600">Step {index + 1}</div>
                      <div className="mt-1 text-sm text-zinc-100">{lesson.title}</div>
                    </div>
                    <DifficultyBadge level={lesson.level} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          {LESSONS.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} active={active?.id === lesson.id} onClick={setActive} />
          ))}
        </section>

        <div className="space-y-5">
          <LessonDetail lesson={active} />
          <section className="panel p-5">
            <div className="panel-title"><span>Apply what you learned</span></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: 'Open dashboard', desc: 'Watch the live signal stream and compare agents.', to: '/dashboard' },
                { title: 'Browse markets', desc: 'Jump into AAPL, NVDA, TSLA, BTC, and more.', to: '/markets' },
                { title: 'Review agents', desc: 'Read each agent\'s crux and example behavior.', to: '/agents' },
              ].map((card) => (
                <Link key={card.title} to={card.to} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/70">
                  <div className="text-sm font-semibold text-zinc-100">{card.title}</div>
                  <div className="mt-2 text-sm text-zinc-500">{card.desc}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
