export function ArtworkThumbnail({ url, size }: { url: string; size: number }) {
  return (
    <div
      className="signal-thumbnail signal-thumbnail--artwork"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={url}
        width={size}
        height={size}
        className="signal-thumbnail-img"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
