const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const apiBaseUrl = configuredApiBaseUrl
  ? `${/^https?:\/\//i.test(configuredApiBaseUrl) ? '' : 'https://'}${configuredApiBaseUrl}`.replace(/\/+$/, '')
  : ''

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
