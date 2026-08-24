/**
 * RFC 5545 (.ics) calendar event generator.
 *
 * Pure functions — no DOM, no React, no side effects.
 * Used by ScoutingBriefCard "Add to Calendar" button.
 */

/**
 * Escape text per RFC 5545 §3.3.11 (TEXT type).
 * Backslash, semicolon, comma, newline must be escaped.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Convert a Date (or ISO string / epoch ms) to UTC iCal format: YYYYMMDDTHHMMSSZ
 * RFC 5545 §3.3.5 (DATE-TIME, UTC time).
 *
 * We use UTC ("Z" suffix) because lumaStartAt is ISO 8601 which encodes
 * timezone offset. Converting to UTC means the calendar app shows the
 * event at the correct local time for the user's timezone automatically.
 *
 * This avoids the most common .ics bug: naively passing a local-time
 * string without timezone, causing the event to appear at the wrong hour.
 */
function toIcsUtc(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

export interface IcsEvent {
  title: string
  description: string
  url: string
  /** ISO 8601 string (preferred) or epoch ms timestamp. */
  startAt: string | number
  /** Duration in minutes (default 60). */
  durationMinutes?: number
  /** UID for the event — should be unique per event. */
  uid: string
}

/**
 * Generate a single-event .ics file content (RFC 5545).
 *
 * Returns the full .ics string including VCALENDAR wrapper.
 * The caller should create a Blob and trigger download.
 */
export function generateIcs(event: IcsEvent): string {
  const startDate = new Date(event.startAt)
  const durationMin = event.durationMinutes ?? 60
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000)

  const dtStart = toIcsUtc(startDate)
  const dtEnd = toIcsUtc(endDate)
  const dtStamp = toIcsUtc(new Date())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASAJU AI//Scouting Brief//EN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `URL:${event.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // RFC 5545 requires CRLF line endings
  return lines.join('\r\n')
}

/**
 * Trigger browser download of an .ics file.
 * Creates a Blob and uses an anchor element with download attribute.
 */
export function downloadIcs(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}