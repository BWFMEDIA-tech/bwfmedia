import { describe, expect, it } from 'vitest';
import { streamThumbnailPath } from './stream-thumbnail';
describe('stream thumbnail identifiers', () => {
  const path = '85a8f0da-bb21-4b1c-a727-2b6ed507d9ce/stream-thumbnails/show-123.png';
  it('resolves existing saved uploads', () => {
    expect(streamThumbnailPath(`https://storage.example/storage/v1/object/public/videos/${path}`)).toBe(path);
  });
  it('rejects unrelated private files', () => {
    expect(streamThumbnailPath('https://storage.example/storage/v1/object/public/videos/85a8f0da-bb21-4b1c-a727-2b6ed507d9ce/private.mp4')).toBeNull();
    expect(streamThumbnailPath(`https://storage.example/storage/v1/object/public/videos/${path}/../private.png`)).toBeNull();
  });
});
