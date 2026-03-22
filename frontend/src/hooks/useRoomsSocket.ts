import { useEffect } from 'react'
import { io } from 'socket.io-client'

const CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL ?? 'http://localhost:3002'

interface UseRoomsSocketOptions {
  userId:        string
  onRoomCreated: () => void  // just refetch rooms
}

export function useRoomsSocket({ userId, onRoomCreated }: UseRoomsSocketOptions) {
  useEffect(() => {
    const socket = io(`${CHAT_WS_URL}/chat`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem("access_token"),
      },
    })

    socket.on('connect', () => {
        console.log('[Rooms Socket] connected')
      socket.emit('subscribe-rooms', { userId })
    })

    socket.on('room-created', () => {
      onRoomCreated()  // trigger Apollo refetch
    })

    return () => { socket.disconnect() }
  }, [userId, onRoomCreated])
}