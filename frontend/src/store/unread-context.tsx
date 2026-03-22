import { createContext, useContext, useState, useCallback } from 'react'

interface UnreadContextType {
  unreadCounts: Record<string, number>
  increment:    (roomId: string) => void
  clear:        (roomId: string) => void
}

const UnreadContext = createContext<UnreadContextType | null>(null)

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const increment = useCallback((roomId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [roomId]: (prev[roomId] ?? 0) + 1,
    }))
  }, [])

  const clear = useCallback((roomId: string) => {
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }))
  }, [])

  return (
    <UnreadContext.Provider value={{ unreadCounts, increment, clear }}>
      {children}
    </UnreadContext.Provider>
  )
}

export function useUnread() {
  const ctx = useContext(UnreadContext)
  if (!ctx) throw new Error('useUnread must be used inside UnreadProvider')
  return ctx
}