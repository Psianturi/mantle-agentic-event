/**
 * Deterministic agent avatar utilities.
 *
 * Generates a consistent color + initials avatar from an agent's ID.
 * No external files, no random — same agent ID always produces the same look.
 * Used by AgentCard and MarketplaceAgentCard.
 */

/** Hash a string to a 32-bit unsigned integer (djb2). */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  return h >>> 0
}

/**
 * Get a deterministic avatar for an agent.
 * Returns Tailwind-compatible inline style colors (bg + text) and initials.
 */
export function getAgentAvatar(agentId: string, name: string): {
  initials: string
  bgColor: string
  textColor: string
  ringColor: string
} {
  const colors: { bg: string; text: string; ring: string }[] = [
    { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    ring: 'ring-cyan-500/30' },
    { bg: 'bg-violet-500/20',  text: 'text-violet-400',  ring: 'ring-violet-500/30' },
    { bg: 'bg-amber-500/20',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
    { bg: 'bg-sky-500/20',     text: 'text-sky-400',     ring: 'ring-sky-500/30' },
    { bg: 'bg-rose-500/20',    text: 'text-rose-400',    ring: 'ring-rose-500/30' },
    { bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  ring: 'ring-indigo-500/30' },
    { bg: 'bg-teal-500/20',    text: 'text-teal-400',    ring: 'ring-teal-500/30' },
  ]

  const idx = hashString(agentId) % colors.length
  const color = colors[idx]

  // Initials: first letter of each word, max 2, uppercase
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return { initials, bgColor: color.bg, textColor: color.text, ringColor: color.ring }
}