export function SignalGlyphThumbnail({ size }: { size: number }) {
  const bars = [
    [0, 6, 2, 2, 1, 0.25],
    [3, 4, 2, 6, 1, 0.35],
    [6, 2, 2, 10, 1, 0.5],
    [9, 5, 2, 4, 1, 0.4],
    [12, 1, 2, 12, 1, 0.55],
    [15, 3, 2, 8, 1, 0.4],
    [18, 5, 2, 4, 1, 0.3],
    [21, 6, 1, 2, 0.5, 0.2],
  ];
  return (
    <div
      className="signal-thumbnail signal-thumbnail--glyph"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 22 14"
        width={size * 0.52}
        height={size * 0.33}
        fill="currentColor"
        aria-hidden="true"
      >
        {bars.map(([x, y, width, height, radius, opacity]) => (
          <rect key={x} x={x} y={y} width={width} height={height} rx={radius} opacity={opacity} />
        ))}
      </svg>
    </div>
  );
}
