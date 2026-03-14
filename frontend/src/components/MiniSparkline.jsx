export default function MiniSparkline({ points = [], positive = true, className = '' }) {
  const values = points.length ? points : [0, 1, 0.5, 1.2, 0.8];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1e-6);

  const path = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className}>
      <path d={path} fill="none" stroke={positive ? '#10b981' : '#f87171'} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
