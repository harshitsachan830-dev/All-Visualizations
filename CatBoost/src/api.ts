const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const apiBaseUrl = (() => {
  if (!configuredApiBaseUrl) return ''
  if (/^https?:\/\//i.test(configuredApiBaseUrl)) return configuredApiBaseUrl.replace(/\/+$/, '')
  const hostname = configuredApiBaseUrl.includes('.')
    ? configuredApiBaseUrl
    : `${configuredApiBaseUrl}.onrender.com`
  return `https://${hostname}`.replace(/\/+$/, '')
})()

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
