import { describe, expect, it } from 'vitest';
import { auditCatalog, type CatalogSong } from './royalty-finder';
const song: CatalogSong = { id: 'owned', title: 'Real Song', artistName: 'Artist', isrc: 'USABC2600001', iswc: 'T123', publisher: 'Publisher', writers: ['Writer'], splitPercent: 100, proAffiliation: 'ASCAP', registrationRefs: { copyright_office: 'ref', ascap: 'ref', songtrust: 'ref', soundexchange: 'ref', mlc: 'ref' } };
describe('Royalty Finder evidence rules', () => {
  it('does not manufacture findings for complete metadata', () => expect(auditCatalog([song])).toEqual([]));
  it('detects a missing ISRC', () => expect(auditCatalog([{ ...song, isrc: '' }]).map(f => f.issue_type)).toEqual(['Missing ISRC']));
  it('accepts formatted valid ISRCs', () => expect(auditCatalog([{ ...song, isrc: 'US-ABC-26-00001' }])).toEqual([]));
  it('detects invalid ISRC format', () => expect(auditCatalog([{ ...song, isrc: 'BAD' }])[0]?.issue_type).toBe('Invalid ISRC format'));
  it('detects missing songwriter metadata', () => expect(auditCatalog([{ ...song, writers: [] }])[0]?.organization).toBe('mlc'));
  it('detects missing publisher', () => expect(auditCatalog([{ ...song, publisher: '' }])[0]?.organization).toBe('songtrust'));
  it('detects incomplete ownership at 80 percent', () => expect(auditCatalog([{ ...song, splitPercent: 80 }])[0]?.issue_type).toBe('Incomplete ownership splits'));
  it('does not require BMI registration from an ASCAP writer', () => expect(auditCatalog([song]).some(f => f.organization === 'bmi')).toBe(false));
  it('a missing reference is not a verified external absence', () => {
    const finding = auditCatalog([{ ...song, registrationRefs: {} }])[0];
    expect(finding?.issue_type).toBe('Registration reference not recorded');
    expect(finding).not.toHaveProperty('match_confidence');
    expect(finding).not.toHaveProperty('amount');
  });
});