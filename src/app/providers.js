'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { FirebaseProvider } from '@/context/FirebaseContext'

export default function Providers({ children }) {
  return (
    <FirebaseProvider>
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemeProvider>
    </FirebaseProvider>
  )
} 