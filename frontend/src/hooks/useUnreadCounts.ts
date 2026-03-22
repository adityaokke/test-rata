import { useState, useCallback } from 'react'

export function useUnreadCounts() {
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

  return { unreadCounts, increment, clear }
}