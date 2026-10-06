interface LegacyWebAudioGlobal {
  webkitAudioContext?: new () => AudioContext;
}

export function createAudioContext(): AudioContext {
  const webAudioGlobal = globalThis as typeof globalThis & LegacyWebAudioGlobal;
  const Constructor = webAudioGlobal.AudioContext ?? webAudioGlobal.webkitAudioContext;
  if (!Constructor) {
    throw new Error('This browser does not support the Web Audio API.');
  }
  return new Constructor();
}
