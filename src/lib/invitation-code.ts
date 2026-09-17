export const INVITATION_CODE_LENGTH = 6

/** Format a six-digit code as `XXX-XXX` without truncating unexpected values. */
export function formatInvitationCode(raw: string): string {
  const clean = raw.replace(/[\s-]/g, '')
  if (!/^\d{6}$/.test(clean)) return raw
  const midpoint = INVITATION_CODE_LENGTH / 2
  return `${clean.slice(0, midpoint)}-${clean.slice(midpoint)}`
}

/** Full pairing code length: 6 digits + 10-character device secret. */
export const PAIRING_CODE_LENGTH = 16

/** Strip spaces/dashes and uppercase a pasted pairing code. */
export function cleanPairingCode(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
}

/** True when a full `NNN-NNN-XXXXXXXXXX` pairing code has been entered. */
export function isPairingCodeComplete(raw: string): boolean {
  const clean = cleanPairingCode(raw)
  return clean.length === PAIRING_CODE_LENGTH && /^\d{6}[A-Z2-9]{10}$/.test(clean)
}

/** Display form: `NNN-NNN-XXXXXXXXXX`. */
export function formatPairingCode(raw: string): string {
  const clean = cleanPairingCode(raw)
  if (clean.length <= 3) return clean
  if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 16)}`
}
