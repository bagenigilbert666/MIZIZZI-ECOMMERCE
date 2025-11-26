export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('mizizzi_token')
}

export function isLoggedIn(): boolean {
  return !!getAuthToken()
}