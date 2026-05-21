import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { TimeProvider } from '@/context/TimeContext'
import { BatchProvider } from '@/context/BatchContext'
import { NotificationProvider } from '@/context/NotificationContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TimeProvider>
          <BatchProvider>
            <NotificationProvider>
              <App />
              <Toaster position="top-right" />
            </NotificationProvider>
          </BatchProvider>
        </TimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
