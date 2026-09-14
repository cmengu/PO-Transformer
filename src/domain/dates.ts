const MONTHS: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Turn a PO or typed date into tracker `dd/mm/yyyy`, or '' if it cannot be read. */
export function toTrackerDate(value: string | undefined): string {
  if (!value) return ''
  const po = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(value.trim())
  if (po) {
    const month = MONTHS[po[2].toUpperCase()]
    if (!month) return ''
    return `${pad2(Number(po[1]))}/${month}/${po[3]}`
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
  if (!slash) return ''
  const day = Number(slash[1])
  const month = Number(slash[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return ''
  return `${pad2(day)}/${pad2(month)}/${slash[3]}`
}

export function parseUkDate(value: string): Date | undefined {
  const normalised = toTrackerDate(value)
  if (!normalised) return undefined
  const [day, month, year] = normalised.split('/')
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

export function requestedDate(raw: string): { value: string; flag: boolean } {
  if (!raw) return { value: '', flag: true }
  const parsed = toTrackerDate(raw)
  if (parsed) return { value: parsed, flag: false }
  return { value: raw, flag: true }
}
