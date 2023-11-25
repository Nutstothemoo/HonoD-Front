import { setCookie, parseCookies } from 'nookies'

const cookies = parseCookies()
export const token = cookies['auth-token']