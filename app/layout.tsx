import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import Navbar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Honod v1',
  description: 'Created by MD',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
        <body className={`${inter.className} bg-zinc-950`}>
        {children}
        <Toaster className='relative z-40' />
      </body>
    </html>
  )
}
