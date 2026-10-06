import type { Page } from '@playwright/test';

const WEB_AUDIO_SHIM = String.raw`
(() => {
  if ('AudioContext' in globalThis) return;

  class TestAudioParam {
    value = 0;
    setTargetAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
  }

  class TestAudioNode {
    connect() { return this; }
  }

  class TestGainNode extends TestAudioNode {
    gain = new TestAudioParam();
  }

  class TestAnalyserNode extends TestAudioNode {
    fftSize = 256;
    smoothingTimeConstant = 0;
    getFloatTimeDomainData(array) { array.fill(0); }
  }

  class TestBufferSourceNode extends TestAudioNode {
    buffer = null;
    loop = false;
    onended = null;
    start() {}
    stop() {}
  }

  class TestAudioContext {
    destination = new TestAudioNode();
    state = 'running';
    get currentTime() { return performance.now() / 1_000; }
    createGain() { return new TestGainNode(); }
    createChannelSplitter() { return new TestAudioNode(); }
    createAnalyser() { return new TestAnalyserNode(); }
    createBufferSource() { return new TestBufferSourceNode(); }
    createBuffer(channelCount, length, sampleRate) {
      const channels = Array.from({ length: channelCount }, () => new Float32Array(length));
      return {
        duration: length / sampleRate,
        length,
        numberOfChannels: channelCount,
        sampleRate,
        getChannelData: (channel) => channels[channel],
      };
    }
    async decodeAudioData(data) {
      const signature = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));
      if (data.byteLength < 44 || signature !== 'RIFF') {
        throw new DOMException('Invalid audio data', 'EncodingError');
      }
      const sampleRate = 8_000;
      const length = Math.max(1, Math.floor((data.byteLength - 44) / 2));
      return this.createBuffer(1, length, sampleRate);
    }
    async resume() {}
  }

  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: TestAudioContext,
  });
})();`;

/**
 * Playwright's Windows WebKit build omits Web Audio. Real Safari ships the API,
 * so this deterministic shim keeps Web Audio workflows cross-engine. Native
 * decoding remains covered by the unshimmed Chromium and Firefox runs.
 */
export async function installWebAudioShimWhenMissing(page: Page): Promise<void> {
  await page.addInitScript({ content: WEB_AUDIO_SHIM });
}
