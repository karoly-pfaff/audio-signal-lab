export function BrandIcon() {
  const bars = [
    [0, 7, 2, 2, 0.4],
    [3, 4, 2, 8, 0.65],
    [6, 1, 2, 14, 1],
    [9, 3, 2, 10, 0.75],
    [12, 5, 2, 6, 0.55],
    [15, 7, 2, 2, 0.35],
  ];
  return (
    <div className="app-bar-brand-icon" aria-hidden="true">
      <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
        {bars.map(([x, y, width, height, opacity]) => (
          <rect
            key={x}
            x={x}
            y={y}
            width={width}
            height={height}
            rx="1"
            fill="currentColor"
            opacity={opacity}
          />
        ))}
      </svg>
    </div>
  );
}
