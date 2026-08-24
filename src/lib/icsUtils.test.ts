import { describe, expect, it } from 'vitest'
import { generateIcs } from './icsUtils'

describe('generateIcs', () => {
  it('produces valid RFC 5545 structure', () => {
    const ics = generateIcs({
      title: 'DeFi Summit 2026',
      description: 'A scouting brief',
      url: 'https://lu.ma/defi-summit',
      startAt: '2026-09-15T14:00:00+07:00',
      uid: 'test-1@asaju.ai',
    })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('UID:test-1@asaju.ai')
  })

  it('converts timezone offset to UTC correctly (the critical bug-prevention test)', () => {
    // Event at 14:00 +07:00 (Jakarta) = 07:00 UTC
    const ics = generateIcs({
      title: 'Test Event',
      description: 'desc',
      url: 'https://example.com',
      startAt: '2026-09-15T14:00:00+07:00',
      uid: 'tz-test@asaju.ai',
    })

    // DTSTART should be 07:00 UTC (not 14:00)
    expect(ics).toContain('DTSTART:20260915T070000Z')
    // DTEND should be 08:00 UTC (60 min later)
    expect(ics).toContain('DTEND:20260915T080000Z')
  })

  it('handles negative timezone offset (e.g. -05:00 New York)', () => {
    // Event at 09:00 -05:00 (New York) = 14:00 UTC
    const ics = generateIcs({
      title: 'NYC Event',
      description: 'desc',
      url: 'https://example.com',
      startAt: '2026-09-15T09:00:00-05:00',
      uid: 'ny-test@asaju.ai',
    })

    expect(ics).toContain('DTSTART:20260915T140000Z')
  })

  it('accepts epoch ms timestamp as fallback', () => {
    // 2026-01-01T00:00:00Z = 1767225600000 ms
    const ics = generateIcs({
      title: 'Epoch Event',
      description: 'desc',
      url: 'https://example.com',
      startAt: 1767225600000,
      uid: 'epoch-test@asaju.ai',
    })

    expect(ics).toContain('DTSTART:20260101T000000Z')
  })

  it('escapes special characters in title and description', () => {
    const ics = generateIcs({
      title: 'Event; with, special\\chars\nnewline',
      description: 'desc; with, commas',
      url: 'https://example.com',
      startAt: '2026-09-15T14:00:00Z',
      uid: 'escape-test@asaju.ai',
    })

    expect(ics).not.toContain('Event; with, special')  // unescaped
    expect(ics).toContain('Event\\; with\\, special\\\\chars\\nnewline')
    expect(ics).toContain('desc\\; with\\, commas')
  })

  it('respects custom duration', () => {
    const ics = generateIcs({
      title: 'Long Event',
      description: 'desc',
      url: 'https://example.com',
      startAt: '2026-09-15T10:00:00Z',
      durationMinutes: 180,
      uid: 'duration-test@asaju.ai',
    })

    expect(ics).toContain('DTSTART:20260915T100000Z')
    expect(ics).toContain('DTEND:20260915T130000Z')
  })

  it('uses CRLF line endings per RFC 5545', () => {
    const ics = generateIcs({
      title: 'CRLF Test',
      description: 'desc',
      url: 'https://example.com',
      startAt: '2026-09-15T14:00:00Z',
      uid: 'crlf-test@asaju.ai',
    })

    expect(ics).toContain('\r\n')
    expect(ics).not.toMatch(/[^\r]\n/)  // no bare LF
  })
})