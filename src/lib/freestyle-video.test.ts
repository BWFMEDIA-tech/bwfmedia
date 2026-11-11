import { describe, expect, it, vi } from 'vitest';
import { subscribeFreestyleCameras } from './freestyle-video';

function participant(identity: string, source = 'camera', isSubscribed = false) {
  const setSubscribed = vi.fn();
  return { identity, trackPublications: new Map([['track', { source, isSubscribed, setSubscribed }]]), setSubscribed };
}

describe('Freestyle remote camera recovery', () => {
  it('subscribes both assigned artist cameras', () => {
    const a = participant('artist-a'); const b = participant('artist-b');
    subscribeFreestyleCameras([a, b], ['artist-a', 'artist-b']);
    expect(a.setSubscribed).toHaveBeenCalledWith(true);
    expect(b.setSubscribed).toHaveBeenCalledWith(true);
  });
  it('does not subscribe audience cameras or microphone publications', () => {
    const audience = participant('viewer'); const mic = participant('artist-a', 'microphone');
    subscribeFreestyleCameras([audience, mic], ['artist-a', 'artist-b']);
    expect(audience.setSubscribed).not.toHaveBeenCalled();
    expect(mic.setSubscribed).not.toHaveBeenCalled();
  });
  it('leaves existing subscriptions unchanged', () => {
    const a = participant('artist-a', 'camera', true);
    subscribeFreestyleCameras([a], ['artist-a']);
    expect(a.setSubscribed).not.toHaveBeenCalled();
  });
  it('restores a camera after reconnect without duplicating participants', () => {
    const a = participant('artist-a');
    subscribeFreestyleCameras([a], ['artist-a', 'artist-a']);
    expect(a.setSubscribed).toHaveBeenCalledTimes(1);
    a.setSubscribed.mockClear();
    subscribeFreestyleCameras([a], ['artist-a']);
    expect(a.setSubscribed).toHaveBeenCalledTimes(1);
  });
});