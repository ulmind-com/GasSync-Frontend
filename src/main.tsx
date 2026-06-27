import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './i18n'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

// Must match the Web OAuth client used by the backend (same Google project).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '143816392628-6cb8kiu12bmd20241kc1tsuhkjasslab.apps.googleusercontent.com'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
