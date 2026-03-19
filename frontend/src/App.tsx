import type { ApolloClient } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { createContext, useContext } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { authClient, chatClient } from './lib/apollo'
import { AuthProvider } from './lib/auth-context'
import { ChatPage } from './pages/ChatPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RoomsPage } from './pages/RoomsPage'

// Expose chatClient to pages that need it
export const ChatClientContext = createContext<ApolloClient>(chatClient)
export const useChatClient = () => useContext(ChatClientContext)

export default function App() {
  return (
    // authClient is the default Apollo client (used for login/register)
    <ApolloProvider client={authClient}>
      <ChatClientContext.Provider value={chatClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/rooms"    element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
              <Route path="/rooms/:roomId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="*"         element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ChatClientContext.Provider>
    </ApolloProvider>
  )
}
