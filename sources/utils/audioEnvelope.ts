export interface SignalRange {
  minimum: number;
  maximum: number;
}

export function sampleSignalRanges(buffer: AudioBuffer, width: number): SignalRange[] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  const sampleLength = channels[0]?.length ?? 0;
  return Array.from({ length: width }, (_, x) => {
    if (sampleLength === 0) {
      return { minimum: 0, maximum: 0 };
    }
    const start = Math.min(sampleLength - 1, Math.floor((x * sampleLength) / width));
    const end = Math.min(
      sampleLength,
      Math.max(start + 1, Math.ceil(((x + 1) * sampleLength) / width)),
    );
    let minimum = 0;
    let maximum = 0;
    for (const samples of channels) {
      for (let index = start; index < end; index++) {
        const sample = samples[index] ?? 0;
        minimum = Math.min(minimum, sample);
        maximum = Math.max(maximum, sample);
      }
    }
    return { minimum, maximum };
  });
}
