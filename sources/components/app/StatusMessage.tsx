import { useAudioLabStore } from '../../store/useAudioLabStore';

export function StatusMessage() {
  const { statusMessage, dismissStatus } = useAudioLabStore();

  if (!statusMessage) {
    return null;
  }

  return (
    <div
      className="status-toast"
      onClick={dismissStatus}
      role="status"
      aria-live="polite"
      title="Click to dismiss"
    >
      {statusMessage}
    </div>
  );
}
