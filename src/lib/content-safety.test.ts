import { describe, expect, it } from 'vitest';
import { requireSafetyAgreement, reportInput } from './content-safety';

describe('content safety validation', () => {
  it('requires the signup safety agreement before either signup method', () => {
    expect(() => requireSafetyAgreement(false)).toThrow('Terms of Service');
    expect(() => requireSafetyAgreement(true)).not.toThrow();
  });
  it('accepts only the four supported report categories', () => {
    for (const category of ['inappropriate','harassment','spam','copyright']) {
      expect(reportInput.safeParse({targetType:'profile',targetId:'00000000-0000-4000-8000-000000000001',category}).success).toBe(true);
    }
    expect(reportInput.safeParse({targetType:'profile',targetId:'00000000-0000-4000-8000-000000000001',category:'invented'}).success).toBe(false);
  });
});