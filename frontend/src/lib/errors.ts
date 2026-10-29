import type { AxiosError } from 'axios'

export function apiErrorDetail(err: unknown): string | null {
  const data = (err as AxiosError<unknown>)?.response?.data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    for (const key of Object.keys(record)) {
      const value = record[key]
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return value[0]
      }
      if (typeof value === 'string') return value
    }
  }
  return null
}

export function friendlyError(err: unknown, fallback: string): string {
  return apiErrorDetail(err) || fallback
}