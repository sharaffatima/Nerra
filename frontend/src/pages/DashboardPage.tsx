import { useMemo } from 'react'
import { format, startOfWeek, addDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { useTodos } from '@/hooks/use-todos'
import { useNotes } from '@/hooks/use-notes'
import { useReminders } from '@/hooks/use-reminders'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTranslation } from '@/i18n'
import { useCountUp } from '@/hooks/useCountUp'
import { quoteOfTheDay } from '@/data/quotes'
import { FocusTimer } from '@/components/ui/FocusTimer'
import { EmptyState } from '@/components/ui/EmptyState'
import { StickyNote, Bell, CheckSquare, Calendar, Flame, Sparkles, Sunrise, Sun, Sunset, Moon, PartyPopper, Timer, Folder } from 'lucide-react'

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return { key: 'greetingMorning', Icon: Sunrise }
  if (hour >= 12 && hour < 16) return { key: 'greetingAfternoon', Icon: Sun }
  if (hour >= 16 && hour < 21) return { key: 'greetingEvening', Icon: Sunset }
  return { key: 'greetingNight', Icon: Moon }
}

function StatNumber({ value }: { value: number }) {
  const n = useCountUp(value)
  return <p className="text-2xl font-semibold text-[rgb(var(--color-text))]">{n}</p>
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { activeWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: todos = [] } = useTodos(activeWorkspace?.id)
  const { data: notes = [] } = useNotes(activeWorkspace?.id)
  const { data: reminders = [] } = useReminders(activeWorkspace?.id)
  const locale = useTranslation().locale

  const completedTodos = todos.filter((todo) => todo.completed).length
  const pendingTodos = todos.length - completedTodos

  const now = new Date()
  const doneToday = todos.filter((todo) => {
    if (!todo.completed) return false
    const d = new Date(todo.updated_at)
    return isAfter(d, startOfDay(now)) && isBefore(d, endOfDay(now))
  }).length

  const allCaughtUp = todos.length > 0 && pendingTodos === 0
  const greeting = greetingForHour(now.getHours())
  const GreetingIcon = greeting.Icon
  const quote = quoteOfTheDay()
  const dateLabel = format(now, 'EEEE, MMMM d')
  const quoteDateLabel = format(now, 'MMMM d')

  const pieData = [
    { name: t('stats.completed'), value: completedTodos, color: 'rgb(var(--color-accent-sage))' },
    { name: t('stats.pending'), value: pendingTodos, color: 'rgb(var(--color-accent-blue-light))' },
  ]

  const weeklyData = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      const created = todos.filter((todo) => {
        const d = new Date(todo.created_at)
        return isAfter(d, dayStart) && isBefore(d, dayEnd)
      }).length
      const done = todos.filter((todo) => {
        if (!todo.completed) return false
        const d = new Date(todo.updated_at)
        return isAfter(d, dayStart) && isBefore(d, dayEnd)
      }).length
      return { day: format(day, 'EEE'), created, done }
    })
  }, [todos])

  const upcoming = useMemo(() => {
    const now = new Date()
    const upcomingReminders = reminders
      .filter((r) => !r.completed && new Date(r.reminder_time) > now)
      .map((r) => ({ type: 'reminder' as const, title: r.title, time: r.reminder_time, id: `r-${r.id}` }))
    const dueTodos = todos
      .filter((todo) => !todo.completed && todo.due_date && new Date(todo.due_date) > now)
      .map((todo) => ({ type: 'todo' as const, title: todo.title, time: todo.due_date!, id: `t-${todo.id}` }))
    return [...upcomingReminders, ...dueTodos].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).slice(0, 5)
  }, [reminders, todos])

  return (
    <div className="relative mx-auto max-w-5xl space-y-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 z-0 h-72 overflow-hidden">
        <div className="absolute start-1/4 -top-16 h-64 w-64 rounded-full bg-[rgb(var(--color-accent-sage))]/15 blur-3xl" />
        <div className="absolute end-1/4 -top-20 h-72 w-72 rounded-full bg-[rgb(var(--color-accent-orange))]/15 blur-3xl" />
      </div>

      {/* Greeting hero */}
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="animate-floaty flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgb(var(--color-accent-sage-light))]">
            <GreetingIcon className="h-7 w-7 text-[rgb(var(--color-accent-sage))]" />
          </span>
          <div>
            <p className="text-sm text-[rgb(var(--color-text-muted))]">{dateLabel}</p>
            <h1 className="animate-pop font-brand text-3xl text-[rgb(var(--color-text))]">{t(`dashboard.${greeting.key}`)}</h1>
            <p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">{t('dashboard.subtitle')}</p>
          </div>
        </div>
        {allCaughtUp && (
          <div className="animate-wiggle flex items-center gap-2 rounded-full bg-[rgb(var(--color-accent-sage-light))] px-4 py-2 text-sm font-medium text-[rgb(var(--color-accent-sage))]">
            <PartyPopper className="h-4 w-4" />
            {t('dashboard.allCaughtUp')}
          </div>
        )}
      </div>

      {/* Quote of the day */}
      <div className="relative flex items-center gap-4 rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-accent-orange-light))]">
          <Sparkles className="h-5 w-5 text-[rgb(var(--color-accent-orange))]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-text-faint))]">
            {t('dashboard.quoteLabel')}
          </p>
          <p className="mt-0.5 italic leading-snug text-[rgb(var(--color-text))]">
            {locale === 'ar' ? quote.ar : quote.en}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[rgb(var(--color-surface-secondary))] px-2.5 py-1 text-[10px] font-medium text-[rgb(var(--color-text-muted))]">
          {quoteDateLabel}
        </span>
      </div>

      {/* Stats row */}
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ease-m3 flex items-center gap-4 rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-accent-orange-light))]">
            <StickyNote className="h-5 w-5 text-[rgb(var(--color-accent-orange))]" />
          </div>
          <div>
            <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('stats.totalNotes')}</p>
            <StatNumber value={notes.length} />
          </div>
        </div>
        <div className="ease-m3 flex items-center gap-4 rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-accent-lavender-light))]">
            <Bell className="h-5 w-5 text-[rgb(var(--color-accent-lavender))]" />
          </div>
          <div>
            <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('stats.upcomingReminders')}</p>
            <StatNumber value={upcoming.length} />
          </div>
        </div>
        <div className="ease-m3 flex items-center gap-4 rounded-2xl bg-[rgb(var(--color-accent-sage-light))] p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="animate-ring-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-accent-sage))]">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-[rgb(var(--color-accent-sage))]">{t('dashboard.today')}</p>
            <div className="flex items-baseline gap-1">
              <StatNumber value={doneToday} />
              <span className="text-xs text-[rgb(var(--color-accent-sage))]">{t('stats.completed')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pie chart — todo completion */}
        <div className="ease-m3 rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[rgb(var(--color-accent-blue))]" />
            <h2 className="text-sm font-medium text-[rgb(var(--color-text))]">{t('stats.todoCompletion')}</h2>
          </div>
          {todos.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-[rgb(var(--color-text-muted))]">{entry.name}</span>
                    <span className="text-sm font-medium text-[rgb(var(--color-text))]">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState compact icon={CheckSquare} title={t('dashboard.noDataTitle')} description={t('dashboard.noDataDesc')} />
          )}
        </div>

        {/* Bar chart — weekly activity */}
        <div className="ease-m3 rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[rgb(var(--color-accent-sage))]" />
            <h2 className="text-sm font-medium text-[rgb(var(--color-text))]">{t('stats.weeklyProductivity')}</h2>
          </div>
          {todos.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyData} barGap={4}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(var(--color-text-muted))' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 4px 20px rgb(0 0 0 / 0.15)', background: 'rgb(var(--color-surface))' }}
                  labelStyle={{ color: 'rgb(var(--color-text))', fontWeight: 500 }}
                />
                <Bar dataKey="created" fill="rgb(var(--color-accent-blue-light))" radius={[6, 6, 0, 0]} name="Created" />
                <Bar dataKey="done" fill="rgb(var(--color-accent-sage))" radius={[6, 6, 0, 0]} name="Done" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState compact icon={Calendar} title={t('dashboard.noDataTitle')} description={t('dashboard.noDataDesc')} />
          )}
        </div>
      </div>

      {/* Focus + Upcoming */}
      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Timer className="h-4 w-4 text-[rgb(var(--color-primary))]" />
            <h2 className="text-sm font-medium text-[rgb(var(--color-text))]">{t('focus.title')}</h2>
          </div>
          <FocusTimer />
        </div>

        {upcoming.length > 0 && (
          <div className="rounded-2xl bg-[rgb(var(--color-surface))] p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[rgb(var(--color-accent-lavender))]" />
              <h2 className="text-sm font-medium text-[rgb(var(--color-text))]">{t('stats.upcomingReminders')}</h2>
            </div>
            <div className="space-y-2">
              {upcoming.map((item) => (
                <div key={item.id} className="ease-m3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-300 hover:bg-[rgb(var(--color-surface-secondary))]">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.type === 'reminder' ? 'bg-[rgb(var(--color-accent-lavender))]' : 'bg-[rgb(var(--color-accent-blue))]'}`} />
                  <span className="flex-1 text-sm text-[rgb(var(--color-text))]">{item.title}</span>
                  <span className="text-xs text-[rgb(var(--color-text-muted))]">
                    {format(new Date(item.time), 'MMM d, h:mm a')}
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-surface-secondary))]">
                    {item.type === 'reminder' ? t('nav.reminders') : t('nav.todos')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {workspaces.length === 0 && (
        <EmptyState
          className="relative"
          icon={Folder}
          title={t('workspace.emptyTitle')}
          description={t('workspace.empty')}
        />
      )}
    </div>
  )
}