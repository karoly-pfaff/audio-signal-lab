export function StereoMeterRow({
  label,
  barRef,
}: {
  label: string;
  barRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="stereo-meter-row">
      <span className="stereo-meter-label">{label}</span>
      <div className="stereo-meter-track">
        <div ref={barRef} className="stereo-meter-bar" />
      </div>
    </div>
  );
}
