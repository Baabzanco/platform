/**
 * Generates a lightweight offline-compatible WAV Blob URL representing
 * a short subtle voice-memo signal so the finance call-recording player
 * works reliably without external audio dependencies.
 */
export function createCallRecordingWavUrl(durationSeconds: number, seed: number): string {
  const sampleRate = 8000;
  const clampedDuration = Math.max(4, Math.min(durationSeconds, 12));
  const numSamples = sampleRate * clampedDuration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const baseFreq = 260 + (seed % 5) * 35;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Gentle voice-like cadence bursts with pauses
    const cadence = Math.sin(t * 2.4 + seed) > -0.25 ? 1 : 0.08;
    const envelope = Math.min(1, t * 8) * Math.min(1, (clampedDuration - t) * 8);
    const freq = baseFreq + Math.sin(t * 5.2 + seed) * 32;
    const wave =
      Math.sin(2 * Math.PI * freq * t) * 0.14 +
      Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.05;
    const sample = Math.max(-1, Math.min(1, wave * cadence * envelope));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
