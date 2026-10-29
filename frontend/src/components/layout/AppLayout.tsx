import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useLocaleStore } from '@/stores/locale-store'
import { useThemeStore } from '@/stores/theme-store'
import { useReminderNotifications } from '@/hooks/use-reminder-notifications'
import { Sidebar } from './Sidebar'
import { Menu, X } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const locale = useLocaleStore((s) => s.locale)
  useThemeStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [locale])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayoutInner sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    </QueryClientProvider>
  )
}

function AppLayoutInner({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }) {
  useReminderNotifications()

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      <main className="relative flex-1 overflow-auto px-4 py-4 pt-8 sm:px-6 sm:py-6 sm:pt-12">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ease-m3 mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] transition-colors duration-300 active:scale-95 lg:hidden"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Outlet />
      </main>
    </div>
  )
}