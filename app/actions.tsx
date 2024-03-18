'use server'

import { cookies } from 'next/headers'

async function deleteSession(name: string) {
  console.log("deleteSession", name)
  cookies().set(name, 'value', { maxAge: 0 })
}

export async function getSessionData() {
  const SessionData = cookies().get('auth_token')?.value
  return SessionData ? JSON.parse((SessionData)) : null
}