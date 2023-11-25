import { token } from './token'

const handleLogout = async () => {
  try {
    const request = await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
    })

    destroyCookie(null, 'auth-token', {
      path: '/',
      sameSite: 'strict',
      maxAge: 0,
    })
    router.push('/auth/signin')

    if (!request.ok) {
      setSuccess('Logged out successfully!')
      setError('')
    }
  } catch (error) {
    setError('Failed to logout')
    setSuccess('')
  }
}