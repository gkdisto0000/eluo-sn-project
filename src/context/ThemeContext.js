'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    // 초기 테마 설정 (로컬 스토리지에서 가져오기)
    const savedTheme = localStorage.getItem('theme')
    setDarkMode(savedTheme === 'dark')
    
    // HTML에 다크모드 클래스 적용
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    setDarkMode(!darkMode)
    // 로컬 스토리지에 테마 저장
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light')
    // HTML 클래스 토글
    document.documentElement.classList.toggle('dark')
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext) 