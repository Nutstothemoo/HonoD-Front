'use server'

import { cookies } from 'next/headers'

async function deleteCookie(name: string) {
  cookies().set(name, 'value', { maxAge: 0 })
}