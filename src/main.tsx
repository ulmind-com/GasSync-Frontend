import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from './components/Toast'
import './i18n'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

// Must match the Web OAuth client used by the backend (same Google project).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '143816392628-6cb8kiu12bmd20241kc1tsuhkjasslab.apps.googleusercontent.com'

// ── Lenis Smooth Scroll ──
import Lenis from 'lenis'

const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
})

function raf(time: number) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// ── Scroll Reveal Observer ──
// Watches elements with .reveal, .reveal-scale, .reveal-left and adds .revealed when visible
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed')
        revealObserver.unobserve(entry.target)
      }
    })
  },
  { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
)

// MutationObserver to auto-attach scroll reveals to dynamically inserted DOM nodes
const domObserver = new MutationObserver(() => {
  document.querySelectorAll('.reveal:not(.revealed), .reveal-scale:not(.revealed), .reveal-left:not(.revealed)').forEach((el) => {
    revealObserver.observe(el)
  })
})
domObserver.observe(document.body, { childList: true, subtree: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
