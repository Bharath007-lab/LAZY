'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Home as HomeIcon, ListChecks, Users, Bell, Handshake, Plug, Brain, Gauge,
  CreditCard, LifeBuoy, ShieldAlert, Cpu, GitBranch, Flag, ScrollText, Bot,
  Sparkles, ArrowRight, Zap, CheckCircle2, Clock, AlertTriangle, Lock,
  Mail, Calendar, HardDrive, MessageSquare, FileText, Github, Send, Loader2,
  Activity, DollarSign, ShieldCheck, Power, TrendingUp, Layers, LogOut, Circle
} from 'lucide-react'

const api = async (path, method = 'GET', body) => {
  const r = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'Request failed')
  return d
}

const CONNECTOR_ICONS = { gmail: Mail, calendar: Calendar, drive: HardDrive, slack: MessageSquare, notion: FileText, github: Github, outlook: Mail, whatsapp: MessageSquare }
const riskColor = { green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/20', red: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }

const EXAMPLES = [
  'Handle my emails from today and remind me if Sarah doesn\u2019t reply.',
  'Find everything I promised people this week.',
  'Prepare my weekly report from Slack and Drive.',
  'Review these files and summarize what matters.',
]

// ============================ SHELL PRIMITIVES ============================
const Glass = ({ className = '', children, ...p }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl ${className}`} {...p}>{children}</div>
)

function Stat({ icon: Icon, label, value, sub, accent = 'text-emerald-400' }) {
  return (
    <Glass className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Glass>
  )
}

// ============================ LOGIN ============================
function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e?.preventDefault()
    if (!email) return
    setBusy(true)
    try {
      const d = await api('/auth/login', 'POST', { email })
      localStorage.setItem('lazy_uid', d.user.id)
      onLogin(d)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black"><Zap className="h-5 w-5" /></div>
          <span className="text-xl font-semibold tracking-tight">LAZY</span>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl text-center text-5xl font-semibold leading-[1.1] tracking-tight text-white md:text-6xl">
          Stop operating software.<br />
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-violet-300 bg-clip-text text-transparent">Give an outcome.</span>
        </motion.h1>
        <p className="mt-6 max-w-xl text-center text-lg text-zinc-400">
          LAZY is your AI workforce. It observes, understands, plans, delegates, executes and verifies — so you just say what you want done.
        </p>
        <form onSubmit={go} className="mt-10 flex w-full max-w-md flex-col gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" type="email"
            className="h-12 border-white/10 bg-white/5 text-center text-base" />
          <Button disabled={busy} className="h-12 bg-gradient-to-r from-emerald-400 to-teal-500 text-base font-medium text-black hover:opacity-90">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Enter your workforce <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>
          <p className="text-center text-xs text-zinc-600">Passwordless demo. Use an email containing "founder" for Operator access.</p>
        </form>
      </div>
    </div>
  )
}

// ============================ MAIN APP ============================
export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [plane, setPlane] = useState('customer')

  useEffect(() => {
    const uid = typeof window !== 'undefined' && localStorage.getItem('lazy_uid')
    if (uid) api('/me?userId=' + uid).then(setSession).catch(() => localStorage.removeItem('lazy_uid')).finally(() => setReady(true))
    else setReady(true)
  }, [])

  if (!ready) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
  if (!session) return <Login onLogin={setSession} />

  const isOperator = ['owner', 'admin'].includes(session.user.role)
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[130px]" />
      </div>
      {plane === 'customer'
        ? <CustomerOS session={session} setSession={setSession} isOperator={isOperator} onPlane={() => setPlane('operator')} />
        : <OperatorOS session={session} onPlane={() => setPlane('customer')} />}
    </div>
  )
}

// ============================ CUSTOMER OS ============================
const CUSTOMER_NAV = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'attention', label: 'Attention', icon: Bell },
  { id: 'commitments', label: 'Commitments', icon: Handshake },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'usage', label: 'Usage', icon: Gauge },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

function CustomerOS({ session, setSession, isOperator, onPlane }) {
  const [section, setSection] = useState('home')
  const uid = session.user.id
  const ent = session.entitlements
  const refreshMe = useCallback(async () => setSession(await api('/me?userId=' + uid)), [uid, setSession])

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/5 px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-black"><Zap className="h-4 w-4" /></div>
          <span className="text-lg font-semibold tracking-tight">LAZY</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {CUSTOMER_NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${section === n.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 space-y-2">
          {isOperator && (
            <button onClick={onPlane} className="flex w-full items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-200 hover:bg-violet-500/20">
              <ShieldAlert className="h-4 w-4" /> Operator OS
            </button>
          )}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">{session.user.name?.[0]?.toUpperCase()}</div>
              <div className="min-w-0"><div className="truncate text-xs text-zinc-300">{session.user.name}</div><div className="text-[10px] uppercase text-emerald-400">{ent.plan_name}</div></div>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('lazy_uid'); location.reload() }} className="flex w-full items-center gap-2 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"><LogOut className="h-3 w-3" /> Sign out</button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-8">
        {section === 'home' && <HomeSection uid={uid} ent={ent} refreshMe={refreshMe} goto={setSection} priority={ent.priority_routing} />}
        {section === 'tasks' && <TasksSection uid={uid} />}
        {section === 'workforce' && <WorkforceSection />}
        {section === 'attention' && <AttentionSection uid={uid} />}
        {section === 'commitments' && <CommitmentsSection uid={uid} />}
        {section === 'connections' && <ConnectionsSection uid={uid} />}
        {section === 'memory' && <MemorySection uid={uid} />}
        {section === 'usage' && <UsageSection uid={uid} ent={ent} />}
        {section === 'billing' && <BillingSection uid={uid} ent={ent} onChange={refreshMe} />}
      </main>
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  )
}

// ---------- HOME : the command center (the AHA) ----------
function HomeSection({ uid, ent, refreshMe, goto, priority }) {
  const [outcome, setOutcome] = useState('')
  const [phase, setPhase] = useState('idle') // idle | planning | plan | executing | done
  const [plan, setPlan] = useState(null)
  const [result, setResult] = useState(null)
  const [overview, setOverview] = useState(null)

  const loadOverview = useCallback(async () => {
    const [t, a, c] = await Promise.all([api('/tasks?userId=' + uid), api('/attention?userId=' + uid), api('/commitments?userId=' + uid)])
    const active = t.tasks.filter((x) => x.status === 'running' || x.status === 'planning').length
    const waiting = t.tasks.filter((x) => x.status === 'waiting_for_user').length
    const handled = t.tasks.filter((x) => x.status === 'completed').length
    const saved = t.tasks.reduce((s, x) => s + (x.time_saved_minutes || 0), 0)
    setOverview({ attention: a.attention.length, active, waiting, handled, commitments: c.commitments.filter((x) => x.status === 'open').length, saved })
  }, [uid])
  useEffect(() => { loadOverview() }, [loadOverview])

  const doPlan = async () => {
    if (!outcome.trim()) return
    setPhase('planning'); setPlan(null); setResult(null)
    try {
      const d = await api('/workforce/plan', 'POST', { userId: uid, outcome })
      setPlan(d); setPhase('plan')
      if (d.over_budget) toast.warning('This task needs more AI Task Units than you have left.')
    } catch (e) { toast.error(e.message); setPhase('idle') }
  }
  const doExecute = async () => {
    setPhase('executing')
    try {
      const p = plan.plan
      const d = await api('/workforce/execute', 'POST', { userId: uid, outcome, steps: p.steps, summary: p.summary, time_saved_minutes: p.time_saved_minutes, planner_model: p.planner_model })
      setResult(d); setPhase('done')
      await refreshMe(); await loadOverview()
      toast.success(d.task.status === 'completed' ? 'Workforce completed the task.' : 'Work drafted — some actions need your approval.')
    } catch (e) { toast.error(e.message); setPhase('plan') }
  }
  const reset = () => { setOutcome(''); setPlan(null); setResult(null); setPhase('idle') }

  const humanStatus = overview
    ? `${overview.attention} thing${overview.attention === 1 ? '' : 's'} need your attention · ${overview.handled} handled · ${overview.waiting} waiting`
    : 'Loading your day…'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center gap-2 text-sm text-emerald-400"><Sparkles className="h-4 w-4" /> {priority ? 'Priority routing active' : 'Your workforce is on'}</div>
      <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Tell me what you want done.</h1>
      <p className="mt-2 text-zinc-500">{humanStatus}</p>

      {/* command bar */}
      <Glass className="mt-6 p-4">
        <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Handle my emails from today and remind me if Sarah doesn't reply."
          className="min-h-[90px] resize-none border-0 bg-transparent text-base focus-visible:ring-0" disabled={phase === 'planning' || phase === 'executing'} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setOutcome(ex)} disabled={phase !== 'idle' && phase !== 'done'}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 transition hover:border-emerald-500/40 hover:text-emerald-300">{ex.length > 42 ? ex.slice(0, 42) + '…' : ex}</button>
            ))}
          </div>
          <Button onClick={doPlan} disabled={!outcome.trim() || phase === 'planning' || phase === 'executing'}
            className="bg-gradient-to-r from-emerald-400 to-teal-500 font-medium text-black hover:opacity-90">
            {phase === 'planning' ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Assembling…</> : <><Zap className="mr-1 h-4 w-4" /> Deploy workforce</>}
          </Button>
        </div>
      </Glass>

      {/* plan preview */}
      <AnimatePresence>
        {(phase === 'plan' || phase === 'executing') && plan && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Glass className="mt-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">{plan.plan.summary}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Planned by {plan.plan.planner_model}</span>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {plan.plan.total_task_units} task units</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{plan.plan.time_saved_minutes}m saved</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {plan.plan.steps.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-xs text-zinc-400">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="truncate text-sm text-white">{s.title}</span>
                        <Badge variant="outline" className={`h-5 border px-1.5 text-[10px] ${riskColor[s.guardian.level]}`}>{s.guardian.level}</Badge></div>
                      <div className="truncate text-xs text-zinc-500">{s.agent_name} · {s.model_capability} · {s.task_units} units</div>
                    </div>
                    {phase === 'executing' && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
                  </div>
                ))}
              </div>
              {phase === 'plan' && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={doExecute} className="bg-gradient-to-r from-emerald-400 to-teal-500 font-medium text-black hover:opacity-90"><ArrowRight className="mr-1 h-4 w-4" /> Approve & run</Button>
                  <Button variant="ghost" onClick={reset} className="text-zinc-400">Cancel</Button>
                </div>
              )}
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* results */}
      <AnimatePresence>
        {phase === 'done' && result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mt-4 space-y-3">
              {result.task.steps.map((s) => (
                <Glass key={s.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {s.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : s.status === 'blocked' ? <Lock className="h-4 w-4 text-rose-400" /> : <Clock className="h-4 w-4 text-amber-400" />}
                      <span className="text-sm font-medium text-white">{s.title}</span>
                      <Badge variant="outline" className={`h-5 border px-1.5 text-[10px] ${riskColor[s.guardian.level]}`}>{s.guardian.level}</Badge>
                    </div>
                    <span className="text-[11px] text-zinc-600">{s.executed_model}</span>
                  </div>
                  {s.approval_reason && <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-300"><ShieldCheck className="h-3 w-3" /> {s.approval_reason}</div>}
                  <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-300">{s.output}</pre>
                  {s.status === 'waiting_for_user' && <div className="mt-3 flex gap-2"><Button size="sm" className="h-7 bg-emerald-500/90 text-xs text-black hover:bg-emerald-400" onClick={() => toast.success('Action approved & performed (demo).')}>Approve & send</Button><Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400">Edit</Button></div>}
                </Glass>
              ))}
              <InsightsRow insights={result.insights} goto={goto} />
              <Button variant="ghost" onClick={reset} className="text-zinc-400"><Sparkles className="mr-1 h-4 w-4" /> New outcome</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* daily overview */}
      {phase === 'idle' && overview && (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <button onClick={() => goto('attention')}><Stat icon={Bell} label="Attention" value={overview.attention} sub="need you" accent="text-amber-400" /></button>
          <button onClick={() => goto('tasks')}><Stat icon={Activity} label="Handled" value={overview.handled} sub="tasks done" /></button>
          <button onClick={() => goto('tasks')}><Stat icon={Clock} label="Waiting" value={overview.waiting} sub="on approval" accent="text-violet-400" /></button>
          <button onClick={() => goto('commitments')}><Stat icon={Handshake} label="Commitments" value={overview.commitments} sub="open" accent="text-teal-400" /></button>
          <div className="col-span-2 md:col-span-4"><Stat icon={TrendingUp} label="Estimated time saved" value={`${Math.floor(overview.saved / 60)}h ${overview.saved % 60}m`} sub="across all handled work" /></div>
        </div>
      )}
    </div>
  )
}

function InsightsRow({ insights, goto }) {
  const has = insights && (insights.commitments.length || insights.attention.length || insights.memory.length)
  if (!has) return null
  return (
    <Glass className="p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white"><Layers className="h-4 w-4 text-emerald-400" /> While working, your workforce also captured:</div>
      <div className="grid gap-3 md:grid-cols-3">
        <div><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Commitments</div>{insights.commitments.length ? insights.commitments.map((c, i) => <div key={i} className="mb-1 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">{c.direction === 'i_owe' ? '↗ You owe' : c.direction === 'they_owe' ? '↙ They owe' : '⧗ Waiting'}: {c.action}</div>) : <div className="text-xs text-zinc-600">None</div>}</div>
        <div><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Attention</div>{insights.attention.length ? insights.attention.map((a, i) => <div key={i} className="mb-1 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">{a.title}</div>) : <div className="text-xs text-zinc-600">None</div>}</div>
        <div><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Memory</div>{insights.memory.length ? insights.memory.map((m, i) => <div key={i} className="mb-1 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">{m.content}</div>) : <div className="text-xs text-zinc-600">None</div>}</div>
      </div>
    </Glass>
  )
}

// ---------- TASKS ----------
function TasksSection({ uid }) {
  const [tasks, setTasks] = useState(null)
  useEffect(() => { api('/tasks?userId=' + uid).then((d) => setTasks(d.tasks)) }, [uid])
  const statusColor = { completed: 'text-emerald-400', waiting_for_user: 'text-amber-400', failed: 'text-rose-400', running: 'text-violet-400' }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Tasks" subtitle="Every outcome your workforce has handled." />
      {!tasks ? <Loading /> : tasks.length === 0 ? <Empty text="No tasks yet — deploy your workforce from Home." /> : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Glass key={t.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{t.requested_action}</span>
                <span className={`text-xs capitalize ${statusColor[t.status] || 'text-zinc-400'}`}>{t.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">{t.steps?.length} steps · {t.task_units} units · ~{t.time_saved_minutes}m saved{t.safe_mode ? ' · safe mode' : ''}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.steps?.map((s) => <Badge key={s.id} variant="outline" className={`border px-2 py-0.5 text-[10px] ${riskColor[s.guardian.level]}`}>{s.agent_name}</Badge>)}
              </div>
            </Glass>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- WORKFORCE (agents) ----------
function WorkforceSection() {
  const [agents, setAgents] = useState(null)
  useEffect(() => { api('/agents').then((d) => setAgents(d.agents)) }, [])
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="Your Workforce" subtitle="Specialist AI agents. Each requests a model capability — the Model Router picks the model." />
      {!agents ? <Loading /> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Glass key={a.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><Bot className="h-4 w-4" /></div><span className="text-sm font-medium text-white">{a.name}</span></div>
                <Badge variant="outline" className={`border px-1.5 text-[10px] ${riskColor[a.risk]}`}>{a.risk}</Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">{a.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-zinc-500">
                <span className="rounded bg-white/5 px-1.5 py-0.5">needs: {a.model_capability}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5">max {a.max_task_units}u</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5">v{a.version}</span>
              </div>
            </Glass>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- ATTENTION ----------
function AttentionSection({ uid }) {
  const [items, setItems] = useState(null)
  const load = useCallback(() => api('/attention?userId=' + uid).then((d) => setItems(d.attention)), [uid])
  useEffect(() => { load() }, [load])
  const act = async (id, action) => { await api('/attention/action', 'POST', { userId: uid, id, action }); toast.success(action); load() }
  const urgencyColor = { high: 'text-rose-400', medium: 'text-amber-400', low: 'text-zinc-400' }
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader title="Attention" subtitle="The Attention Engine surfaces only what truly matters — not every notification." />
      {!items ? <Loading /> : items.length === 0 ? <Empty text="Nothing needs your attention. Enjoy being lazy." /> : (
        <div className="space-y-3">
          {items.map((a) => (
            <Glass key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-white">{a.title}</span><span className={`text-[10px] uppercase ${urgencyColor[a.urgency]}`}>{a.urgency}</span></div>
                  <p className="mt-1 text-xs text-zinc-400">{a.why}</p>
                  {a.recommended_action && <p className="mt-1 text-xs text-emerald-400">→ {a.recommended_action}</p>}
                </div>
                <div className="flex flex-col items-center"><div className="text-lg font-semibold text-white">{a.score}</div><div className="text-[9px] text-zinc-600">SCORE</div></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="h-7 bg-white/10 text-xs hover:bg-white/20" onClick={() => act(a.id, 'complete')}>Done</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400" onClick={() => act(a.id, 'snooze')}>Snooze</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400" onClick={() => act(a.id, 'archive')}>Ignore</Button>
              </div>
            </Glass>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- COMMITMENTS ----------
function CommitmentsSection({ uid }) {
  const [items, setItems] = useState(null)
  useEffect(() => { api('/commitments?userId=' + uid).then((d) => setItems(d.commitments)) }, [uid])
  const groups = { i_owe: 'I owe', they_owe: 'They owe', waiting: 'Waiting' }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Commitments" subtitle="Promises detected across your sources — with a link back to the original context." />
      {!items ? <Loading /> : items.length === 0 ? <Empty text="No commitments detected yet." /> : (
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(groups).map(([k, label]) => (
            <div key={k}>
              <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{label}</div>
              <div className="space-y-2">
                {items.filter((i) => i.direction === k).map((c) => (
                  <Glass key={c.id} className="p-4">
                    <div className="text-sm text-white">{c.action}</div>
                    <div className="mt-1 text-xs text-zinc-500">{c.person || '—'} · due {c.due || 'unspecified'}</div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600"><span>{c.source}</span><span>conf {Math.round((c.confidence || 0) * 100)}%</span></div>
                  </Glass>
                ))}
                {items.filter((i) => i.direction === k).length === 0 && <div className="text-xs text-zinc-600">None</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- CONNECTIONS ----------
function ConnectionsSection({ uid }) {
  const [connectors, setConnectors] = useState(null)
  const load = useCallback(() => api('/connectors?userId=' + uid).then((d) => setConnectors(d.connectors)), [uid])
  useEffect(() => { load() }, [load])
  const toggle = async (c) => {
    try {
      if (c.connected) { await api('/connectors/disconnect', 'POST', { userId: uid, id: c.id }); toast('Disconnected ' + c.name) }
      else { await api('/connectors/connect', 'POST', { userId: uid, id: c.id }); toast.success('Connected ' + c.name) }
      load()
    } catch (e) { toast.error(e.message) }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Connect your digital life" subtitle="Your workforce acts across these. First release ships secure mock connectors." />
      {!connectors ? <Loading /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {connectors.map((c) => {
            const Icon = CONNECTOR_ICONS[c.id] || Plug
            const soon = c.status === 'coming_soon'
            return (
              <Glass key={c.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-300"><Icon className="h-5 w-5" /></div>
                    <div>
                      <div className="flex items-center gap-2"><span className="text-sm font-medium text-white">{c.name}</span>
                        {c.implementation === 'mock' && <Badge variant="outline" className="h-4 border-amber-500/30 px-1 text-[9px] text-amber-400">MOCK</Badge>}
                        {soon && <Badge variant="outline" className="h-4 border-white/20 px-1 text-[9px] text-zinc-400">SOON</Badge>}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 capitalize">{c.category} · {c.auth_method}</div>
                    </div>
                  </div>
                  {c.connected ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Circle className="h-2 w-2 fill-emerald-400" /> Connected</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1 text-[10px] text-zinc-500">{c.actions.slice(0, 4).map((a) => <span key={a} className="rounded bg-white/5 px-1.5 py-0.5">{a}</span>)}</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600">{c.allowed ? `Read ${c.read ? '✓' : '✗'} · Write ${c.write ? '✓' : '✗'}` : 'Not in your plan'}</span>
                  <Button size="sm" disabled={soon || !c.allowed} onClick={() => toggle(c)}
                    className={`h-7 text-xs ${c.connected ? 'bg-white/10 hover:bg-white/20' : 'bg-emerald-500/90 text-black hover:bg-emerald-400'}`}>
                    {c.connected ? 'Disconnect' : soon ? 'Coming soon' : 'Connect'}
                  </Button>
                </div>
              </Glass>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- MEMORY ----------
function MemorySection({ uid }) {
  const [items, setItems] = useState(null)
  const [val, setVal] = useState('')
  const load = useCallback(() => api('/memory?userId=' + uid).then((d) => setItems(d.memory)), [uid])
  useEffect(() => { load() }, [load])
  const add = async () => { if (!val.trim()) return; await api('/memory', 'POST', { userId: uid, content: val, type: 'fact' }); setVal(''); load() }
  const del = async (id) => { await api('/memory/delete', 'POST', { userId: uid, id }); load() }
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader title="Memory" subtitle="What LAZY remembers. You are always in control — view, edit or delete." />
      <Glass className="mb-4 flex gap-2 p-3">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Teach your workforce a fact or preference…" className="border-white/10 bg-white/5" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} className="bg-emerald-500/90 text-black hover:bg-emerald-400">Remember</Button>
      </Glass>
      {!items ? <Loading /> : items.length === 0 ? <Empty text="No long-term memory yet." /> : (
        <div className="space-y-2">
          {items.map((m) => (
            <Glass key={m.id} className="flex items-center justify-between p-4">
              <div><Badge variant="outline" className="mr-2 h-5 border-white/10 text-[10px] capitalize text-zinc-400">{m.type}</Badge><span className="text-sm text-zinc-200">{m.content}</span></div>
              <button onClick={() => del(m.id)} className="text-xs text-zinc-600 hover:text-rose-400">delete</button>
            </Glass>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- USAGE ----------
function UsageSection({ uid, ent }) {
  const pct = Math.min(100, Math.round((ent.used_task_units / ent.task_units) * 100))
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader title="Usage" subtitle="You never see tokens — only AI Task Units." />
      <Glass className="p-6">
        <div className="flex items-end justify-between"><div><div className="text-4xl font-semibold text-white">{ent.remaining_task_units}</div><div className="text-sm text-zinc-500">of {ent.task_units} task units left this month</div></div><Badge className="bg-emerald-500/20 text-emerald-300">{ent.plan_name}</Badge></div>
        <Progress value={pct} className="mt-4 h-2 bg-white/10" />
        <div className="mt-1 text-xs text-zinc-600">{ent.used_task_units} used ({pct}%)</div>
      </Glass>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Zap} label="Automations" value={ent.limits.automations} sub="workflow limit" />
        <Stat icon={Layers} label="Concurrency" value={ent.limits.concurrency} sub="parallel agents" accent="text-violet-400" />
        <Stat icon={Bot} label="Voice" value={ent.limits.voice_minutes} sub="minutes/mo" accent="text-teal-400" />
        <Stat icon={Cpu} label="Desktop" value={ent.limits.desktop_tasks} sub="tasks/mo" accent="text-amber-400" />
      </div>
    </div>
  )
}

// ---------- BILLING ----------
function BillingSection({ uid, ent, onChange }) {
  const [plans, setPlans] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api('/plans').then((d) => setPlans(d.plans)) }, [])
  const change = async (p) => { setBusy(true); try { await api('/billing/change-plan', 'POST', { userId: uid, plan: p }); toast.success('Switched to ' + p); await onChange() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="Billing & Plans" subtitle="Configuration-driven plans. Entitlements enforced by the backend." />
      {!plans ? <Loading /> : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const current = ent.plan === p.id
            return (
              <Glass key={p.id} className={`p-6 ${current ? 'ring-2 ring-emerald-400/50' : ''}`}>
                <div className="flex items-center justify-between"><span className="text-lg font-semibold text-white">{p.name}</span>{current && <Badge className="bg-emerald-500/20 text-emerald-300">Current</Badge>}</div>
                <div className="mt-2 text-3xl font-semibold text-white">${p.price}<span className="text-sm text-zinc-500">/mo</span></div>
                <div className="mt-1 text-xs text-zinc-500">{p.task_units} AI task units · {p.multiplier}× capacity</div>
                <Separator className="my-4 bg-white/10" />
                <ul className="space-y-2 text-xs text-zinc-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {p.limits.automations} automations</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {p.limits.concurrency} concurrent agents</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {p.limits.desktop_tasks} desktop tasks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {p.features.length} features {p.priority_routing ? '· priority routing' : ''}</li>
                </ul>
                <Button disabled={current || busy} onClick={() => change(p.id)} className={`mt-5 w-full ${current ? 'bg-white/5 text-zinc-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:opacity-90'}`}>
                  {current ? 'Current plan' : `Switch to ${p.name}`}
                </Button>
              </Glass>
            )
          })}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-zinc-600">Stripe checkout wiring is scaffolded per spec; demo switches plans directly.</p>
    </div>
  )
}

// ============================ OPERATOR OS ============================
const OPERATOR_NAV = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'ai', label: 'AI Operator', icon: Bot },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'connectors', label: 'Connectors', icon: Plug },
  { id: 'kill', label: 'Kill Switches', icon: Power },
  { id: 'flags', label: 'Feature Flags', icon: Flag },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
]

function OperatorOS({ session, onPlane }) {
  const [section, setSection] = useState('overview')
  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-black/40 px-4 py-6 md:flex">
        <div className="mb-1 flex items-center gap-2 px-2"><ShieldAlert className="h-5 w-5 text-violet-400" /><span className="text-lg font-semibold tracking-tight">Operator OS</span></div>
        <div className="mb-6 px-2 text-[10px] uppercase tracking-wider text-violet-400/70">Mission Control</div>
        <nav className="flex flex-1 flex-col gap-1">
          {OPERATOR_NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${section === n.id ? 'bg-violet-500/20 text-violet-100' : 'text-zinc-400 hover:bg-white/5'}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </button>
          ))}
        </nav>
        <button onClick={onPlane} className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"><HomeIcon className="h-4 w-4" /> Back to Customer OS</button>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-8">
        {section === 'overview' && <OpOverview />}
        {section === 'ai' && <OpAI />}
        {section === 'models' && <OpModels />}
        {section === 'connectors' && <OpConnectors />}
        {section === 'kill' && <OpKill />}
        {section === 'flags' && <OpFlags />}
        {section === 'audit' && <OpAudit />}
      </main>
    </div>
  )
}

function OpOverview() {
  const [s, setS] = useState(null)
  useEffect(() => { api('/operator/overview').then(setS) }, [])
  if (!s) return <Loading />
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader title="System Overview" subtitle={`Live · ${new Date(s.generated_at).toLocaleTimeString()}`} />
      {s.system.safe_mode && <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300"><ShieldAlert className="h-4 w-4" /> Global Safe Mode is ON — autonomous external actions are paused.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Users" value={s.users.total} sub={Object.entries(s.users.plan_distribution).map(([k, v]) => `${v} ${k}`).join(' · ')} />
        <Stat icon={ListChecks} label="Tasks" value={s.tasks.total} sub={`${s.tasks.success_rate}% success`} />
        <Stat icon={DollarSign} label="MRR" value={`$${s.revenue.mrr}`} sub={`ARR $${s.revenue.arr}`} accent="text-teal-400" />
        <Stat icon={TrendingUp} label="Gross margin" value={`${s.revenue.gross_margin_pct}%`} sub={`AI cost $${s.ai.total_cost_usd}`} accent="text-violet-400" />
        <Stat icon={Cpu} label="AI calls" value={s.ai.total_calls} sub={`${s.ai.success_rate}% ok`} />
        <Stat icon={Clock} label="Time saved" value={`${Math.floor(s.tasks.time_saved_minutes / 60)}h`} sub="for customers" accent="text-emerald-400" />
        <Stat icon={AlertTriangle} label="Failed tasks" value={s.tasks.failed} sub="needs review" accent="text-rose-400" />
        <Stat icon={Activity} label="Providers" value={Object.keys(s.ai.by_provider).length} sub={Object.keys(s.ai.by_provider).join(', ')} />
      </div>
    </div>
  )
}

function OpAI() {
  const [q, setQ] = useState('')
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const suggestions = ['What is broken?', 'How many users are active?', 'Why did AI cost increase?', 'Which provider is unhealthy?']
  const ask = async (question) => {
    const text = question || q
    if (!text.trim()) return
    setBusy(true); setLog((l) => [...l, { role: 'user', text }]); setQ('')
    try { const d = await api('/operator/ai', 'POST', { question: text }); setLog((l) => [...l, { role: 'ai', text: d.answer, model: d.model }]) }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <SectionHeader title="AI Operator" subtitle="Ask about the system in plain language. Answers are grounded on live metrics." />
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {log.length === 0 && (
          <div className="flex flex-wrap gap-2">{suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-violet-500/30 px-3 py-1.5 text-sm text-violet-200 hover:bg-violet-500/10">{s}</button>)}</div>
        )}
        {log.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-violet-500/20 text-violet-50' : 'border border-white/10 bg-white/[0.03] text-zinc-200'}`}>
              <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">{m.text}</pre>
              {m.model && <div className="mt-2 text-[10px] text-zinc-600">{m.model}</div>}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Operator is investigating…</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask the operator…" className="border-white/10 bg-white/5" />
        <Button onClick={() => ask()} disabled={busy} className="bg-violet-500 hover:bg-violet-400"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

function OpModels() {
  const [models, setModels] = useState(null)
  const load = () => api('/operator/models').then((d) => setModels(d.models))
  useEffect(() => { load() }, [])
  const toggle = async (m) => { await api('/operator/models/toggle', 'POST', { id: m.id, enabled: !m.enabled }); toast(`${m.label} ${!m.enabled ? 'enabled' : 'disabled'}`); load() }
  if (!models) return <Loading />
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Model Router" subtitle="Providers & models are configuration. Disable one and traffic reroutes via fallback." />
      <div className="space-y-3">
        {models.map((m) => (
          <Glass key={m.id} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="text-sm font-medium text-white">{m.label}</span><Badge variant="outline" className="h-5 border-white/10 text-[10px] text-zinc-400">{m.provider}</Badge>{m.fallback_priority > 1 && <Badge variant="outline" className="h-5 border-white/10 text-[10px] text-zinc-500">fallback</Badge>}</div>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-zinc-500">{m.capabilities.map((c) => <span key={c} className="rounded bg-white/5 px-1.5 py-0.5">{c}</span>)}</div>
              </div>
              <Switch checked={m.enabled} onCheckedChange={() => toggle(m)} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-center text-xs">
              <div><div className="text-white">{m.calls}</div><div className="text-zinc-600">calls</div></div>
              <div><div className={m.success_rate >= 95 ? 'text-emerald-400' : 'text-amber-400'}>{m.success_rate}%</div><div className="text-zinc-600">success</div></div>
              <div><div className="text-white">{m.avg_latency}ms</div><div className="text-zinc-600">latency</div></div>
              <div><div className="text-white">${m.cost}</div><div className="text-zinc-600">cost</div></div>
            </div>
          </Glass>
        ))}
      </div>
    </div>
  )
}

function OpConnectors() {
  const [items, setItems] = useState(null)
  const load = () => api('/operator/connectors').then((d) => setItems(d.connectors))
  useEffect(() => { load() }, [])
  const kill = async (c) => { await api('/operator/killswitches', 'POST', { scope: 'connector', id: c.id, value: c.kill ? true : false }); toast(`${c.name} ${c.kill ? 'enabled' : 'kill switch on'}`); load() }
  if (!items) return <Loading />
  const dot = { healthy: 'bg-emerald-400', disabled: 'bg-rose-400', planned: 'bg-zinc-600' }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Connector Health" subtitle="Global kill switch per integration. Every toggle is audited." />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((c) => (
          <Glass key={c.id} className="flex items-center justify-between p-5">
            <div>
              <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${dot[c.health]}`} /><span className="text-sm font-medium text-white">{c.name}</span><Badge variant="outline" className="h-4 border-white/10 text-[9px] text-zinc-500">{c.implementation}</Badge></div>
              <div className="mt-1 text-xs text-zinc-500">{c.connected_users} users · {c.health}</div>
            </div>
            {c.status !== 'coming_soon' && <Button size="sm" onClick={() => kill(c)} className={`h-7 text-xs ${c.kill ? 'bg-emerald-500/90 text-black' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'}`}>{c.kill ? 'Enable' : 'Kill'}</Button>}
          </Glass>
        ))}
      </div>
    </div>
  )
}

function OpKill() {
  const [ks, setKs] = useState(null)
  const [agents, setAgents] = useState([])
  const load = () => api('/operator/killswitches').then((d) => setKs(d.kill_switches))
  useEffect(() => { load(); api('/agents').then((d) => setAgents(d.agents)) }, [])
  const set = async (key, value, scope, id) => { const d = await api('/operator/killswitches', 'POST', { key, value, scope, id }); setKs(d.kill_switches); toast.success('Kill switch updated') }
  if (!ks) return <Loading />
  const Row = ({ label, desc, on, onToggle, danger }) => (
    <Glass className="flex items-center justify-between p-5">
      <div><div className={`text-sm font-medium ${danger && on ? 'text-amber-300' : 'text-white'}`}>{label}</div><div className="mt-0.5 text-xs text-zinc-500">{desc}</div></div>
      <Switch checked={on} onCheckedChange={onToggle} />
    </Glass>
  )
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader title="Kill Switches" subtitle="Immediately halt autonomous execution. Everything logged." />
      <div className="space-y-3">
        <Row label="Global Safe Mode" desc="Stops autonomous external actions & new executions. Auth, admin & support stay up." on={ks.global_safe_mode} danger onToggle={(v) => set('global_safe_mode', v)} />
        <Row label="Pause All Automations" desc="Freeze every customer automation." on={ks.automations_paused} onToggle={(v) => set('automations_paused', v)} />
        <Row label="Disable Desktop Worker" desc="Block all desktop task execution." on={ks.desktop_disabled} onToggle={(v) => set('desktop_disabled', v)} />
      </div>
      <div className="mb-2 mt-6 text-xs uppercase tracking-wide text-zinc-500">Per-agent kill switches</div>
      <div className="grid gap-2 md:grid-cols-2">
        {agents.map((a) => {
          const on = ks.agents?.[a.id] !== false
          return (
            <Glass key={a.id} className="flex items-center justify-between p-3">
              <span className="text-sm text-zinc-200">{a.name}</span>
              <Switch checked={on} onCheckedChange={(v) => set(null, v, 'agent', a.id)} />
            </Glass>
          )
        })}
      </div>
    </div>
  )
}

function OpFlags() {
  const [data, setData] = useState(null)
  const load = () => api('/operator/featureflags').then(setData)
  useEffect(() => { load() }, [])
  const options = ['enabled', 'disabled', 'beta', 'internal', '10_percent']
  const set = async (id, flag) => { const d = await api('/operator/featureflags', 'POST', { id, flag }); setData((p) => ({ ...p, feature_flags: d.feature_flags })); toast.success(`${id} → ${flag}`) }
  if (!data) return <Loading />
  const flagColor = { enabled: 'text-emerald-400', disabled: 'text-rose-400', beta: 'text-amber-400', internal: 'text-violet-400', '10_percent': 'text-teal-400' }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader title="Feature Flags" subtitle="Global rollout control per feature module — from the feature registry." />
      <div className="grid gap-3 md:grid-cols-2">
        {data.features.map((f) => {
          const flag = data.feature_flags[f.id] || f.flag
          return (
            <Glass key={f.id} className="p-4">
              <div className="flex items-center justify-between">
                <div><span className="text-sm font-medium text-white">{f.name}</span> <span className="text-[10px] text-zinc-600">v{f.version}</span>
                  {f.depends_on.length > 0 && <div className="mt-0.5 text-[10px] text-zinc-600">depends on: {f.depends_on.join(', ')}</div>}</div>
                <span className={`text-xs ${flagColor[flag]}`}>{flag}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {options.map((o) => <button key={o} onClick={() => set(f.id, o)} className={`rounded px-2 py-0.5 text-[10px] ${flag === o ? 'bg-white/15 text-white' : 'bg-white/5 text-zinc-500 hover:text-zinc-300'}`}>{o}</button>)}
              </div>
            </Glass>
          )
        })}
      </div>
    </div>
  )
}

function OpAudit() {
  const [logs, setLogs] = useState(null)
  useEffect(() => { api('/operator/audit').then((d) => setLogs(d.logs)) }, [])
  if (!logs) return <Loading />
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader title="Audit Log" subtitle="Every significant action, immutable and attributable." />
      <div className="space-y-1.5">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2 text-xs">
            <span className="text-zinc-600">{new Date(l.createdAt).toLocaleTimeString()}</span>
            <span className="font-mono text-emerald-400">{l.action}</span>
            <span className="text-zinc-400">{l.target || ''}</span>
            <span className="ml-auto text-zinc-600">{l.actor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================ SHARED ============================
function Loading() { return <div className="flex items-center gap-2 py-10 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> }
function Empty({ text }) { return <Glass className="p-10 text-center text-sm text-zinc-500">{text}</Glass> }
