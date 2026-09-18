import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidateTag } from 'next/cache';
import { expireTagNow } from './expire-tag';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('expireTagNow', () => {
  beforeEach(() => {
    vi.mocked(revalidateTag).mockClear();
  });

  it('calls revalidateTag with exactly one argument', () => {
    expireTagNow('cms');
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(vi.mocked(revalidateTag).mock.calls[0]).toEqual(['cms']);
  });
});
