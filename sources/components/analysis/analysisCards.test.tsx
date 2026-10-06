import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { Marker } from '../../audio/types';
import type { SpectroFrames } from '../../utils/instrumentUtils';
import { DynamicsGauge } from './DynamicsGauge';
import { SignalEventRail } from './SignalEventRail';
import { SpectralCentroidCard } from './SpectralCentroidCard';

it('renders every dynamics color range and missing values', () => {
  const { container, rerender } = render(
    <DynamicsGauge dynamicRangeProxyDb={null} crestFactorDb={null} />,
  );
  expect(container).toHaveTextContent('—');
  for (const [value, color] of [
    [3, '#E87070'],
    [10, '#E8A84A'],
    [20, '#72E8A0'],
    [30, '#8BA8EE'],
  ] as const) {
    rerender(<DynamicsGauge dynamicRangeProxyDb={value} crestFactorDb={value / 2} />);
    expect(container.querySelectorAll(`path[stroke="${color}"]`)).toHaveLength(1);
    expect(container).toHaveTextContent(`${value.toFixed(1)} dB`);
    expect(container).toHaveTextContent(`${(value / 2).toFixed(1)} dB`);
  }
});

function spectrumAt(bin: number): SpectroFrames {
  const flat = new Float32Array(256);
  flat[bin] = 1;
  return { flat, numFrames: 1, binsPerFrame: 256, centroidBin: bin };
}

it('formats missing, low, mid, and high spectral centroids', () => {
  const { container, rerender } = render(
    <SpectralCentroidCard spectroFrames={null} sampleRate={44_100} />,
  );
  expect(container).toHaveTextContent('—');
  expect(container.querySelector('.spectral-centroid-indicator')).toBeNull();
  rerender(<SpectralCentroidCard spectroFrames={spectrumAt(1)} sampleRate={44_100} />);
  expect(container).toHaveTextContent('22 Hz');
  expect(container.querySelector('.spectral-centroid-value')).toHaveStyle({ color: '#E8A84A' });
  rerender(<SpectralCentroidCard spectroFrames={spectrumAt(50)} sampleRate={44_100} />);
  expect(container).toHaveTextContent('1.1 kHz');
  expect(container.querySelector('.spectral-centroid-value')).toHaveStyle({ color: '#8BA8EE' });
  rerender(<SpectralCentroidCard spectroFrames={spectrumAt(200)} sampleRate={44_100} />);
  expect(container.querySelector('.spectral-centroid-value')).toHaveStyle({ color: '#A0D0FF' });
  rerender(<SpectralCentroidCard spectroFrames={spectrumAt(1)} sampleRate={0} />);
  expect(container).toHaveTextContent('—');
});

const MARKERS: Marker[] = [
  { id: 'point', type: 'point', startSeconds: 2, label: 'Point', createdAt: 1 },
  { id: 'range', type: 'range', startSeconds: 4, endSeconds: 6, label: 'Range', createdAt: 2 },
];

it('renders every signal event rail layer at its timeline position', () => {
  const { container } = render(
    <SignalEventRail
      duration={10}
      markers={MARKERS}
      clippingRegions={[{ startSeconds: 7, endSeconds: 7.01 }]}
      silentRegions={[{ startSeconds: 0, endSeconds: 1 }]}
      selection={{ startSeconds: 1, endSeconds: 3 }}
      hoverRatio={0.25}
      playhead={0.5}
    />,
  );
  expect(container.querySelector('.event-rail-selection')).toHaveStyle({ left: '10%' });
  expect(container.querySelector('.event-rail-silence')).toHaveStyle({ width: '10%' });
  expect(container.querySelector('.event-rail-clip')).toHaveStyle({ width: '0.15%' });
  expect(container.querySelector('.event-rail-marker-point')).toHaveStyle({ left: '20%' });
  expect(container.querySelector('.event-rail-marker-range')).toHaveStyle({ width: '20%' });
  expect(container.querySelector('.event-rail-hover')).toHaveStyle({ left: '25%' });
  expect(container.querySelector('.event-rail-playhead')).toHaveStyle({ left: '50%' });
});

it('hides the event rail and rejects invalid optional positions', () => {
  const props = {
    markers: [] as Marker[],
    clippingRegions: [],
    silentRegions: [],
    selection: null,
  };
  const { container, rerender } = render(<SignalEventRail {...props} duration={0} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<SignalEventRail {...props} duration={10} hoverRatio={2} playhead={-1} />);
  expect(container.querySelector('.event-rail-hover')).toBeNull();
  expect(container.querySelector('.event-rail-playhead')).toBeNull();
});
