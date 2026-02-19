import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { translations } from './lib/translations'
import type { User } from '@supabase/supabase-js'

type Page = 'landing' | 'form' | 'result' | 'payment-success' | 'login' | 'signup' | 'mypage' | 'subscription'
type Language = 'en' | 'ko'
type UnitSystem = 'metric' | 'imperial'

const getInitialLang = (): Language => {
  if (typeof window === 'undefined') return 'ko'
  const stored = window.localStorage.getItem('globalsell-lang')
  if (stored === 'en' || stored === 'ko') return stored
  const nav = window.navigator.language?.toLowerCase() || ''
  return nav.startsWith('ko') ? 'ko' : 'en'
}

const pageRoutes: Record<Page, string> = {
  landing: '/',
  form: '/form',
  result: '/result',
  'payment-success': '/payment-success',
  login: '/login',
  signup: '/signup',
  mypage: '/mypage',
  subscription: '/subscription',
}

const routeToPage: Record<string, Page> = Object.entries(pageRoutes).reduce((acc, [page, path]) => {
  acc[path] = page as Page
  return acc
}, {} as Record<string, Page>)

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/'
  const page = routeToPage[normalizedPath] || 'landing'

  const navigateTo = (nextPage: Page, replace = false) => {
    const path = pageRoutes[nextPage]
    navigate(path, { replace })
  }

  const [lang, setLang] = useState<Language>(getInitialLang)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric')
  const [photo, setPhoto] = useState<string | null>(null)
  const [category, setCategory] = useState('fashion')
  const [targetMarket, setTargetMarket] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const [user, setUser] = useState<User | null>(null)
  const [dailyRec, setDailyRec] = useState<{ recommendation_date: string; recommendation: string } | null>(null)
  const [dailyRecLoading, setDailyRecLoading] = useState(false)

  const [emailSending, setEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const t = translations[lang]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photo || !category || !targetMarket || !targetPrice) {
      alert(t.errors.fillAll)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo,
          gender: category,
          height: targetMarket,
          weight: targetPrice,
          unitSystem,
          lang
        }),
      })

      const data = await response.json()
      if (data.error) {
        alert(t.errors.apiError + data.error)
      } else {
        setReport(data.report)
        navigateTo('result')
      }
    } catch {
      alert(t.errors.connectionFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!user?.email || !report) return
    setEmailSending(true)
    setEmailStatus('idle')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, report, lang }),
      })
      if (res.ok) {
        setEmailStatus('success')
        alert(t.result.emailSent)
      } else {
        setEmailStatus('error')
      }
    } catch {
      setEmailStatus('error')
    } finally {
      setEmailSending(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user) { navigateTo('login'); return; }
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, lang }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert(t.errors.connectionFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowUserMenu(false)
    navigateTo('landing')
  }

  const fetchDailyTrends = async () => {
    if (!user) return
    setDailyRecLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/daily-recommendation', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      })
      const data = await response.json()
      if (response.ok && data?.recommendation) {
        setDailyRec(data.recommendation)
      }
    } catch {
      setDailyRec(null)
    } finally {
      setDailyRecLoading(false)
    }
  }

  useEffect(() => {
    if (page === 'mypage' && user) fetchDailyTrends()
  }, [page, user])

  const Navbar = () => (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
        <h1 onClick={() => navigateTo('landing')} className="text-white text-xl font-extrabold tracking-tight cursor-pointer">
          GlobalSell <span className="text-primary text-2xl">AI</span>
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'en' ? 'ko' : 'en')} className="text-white/60 text-sm hover:text-white transition-colors">
            {lang.toUpperCase()}
          </button>
          {user ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">person</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 glass rounded-xl border border-white/10 p-2 shadow-2xl">
                  <button onClick={() => { navigateTo('mypage'); setShowUserMenu(false) }} className="w-full text-left px-4 py-2 text-white/80 hover:bg-white/5 rounded-lg text-sm transition-colors">
                    {t.mypage.title}
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-400/5 rounded-lg text-sm transition-colors">
                    {t.login.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigateTo('login')} className="bg-primary text-background-dark px-4 py-1.5 rounded-lg text-sm font-bold">
              {t.login.login}
            </button>
          )}
        </div>
      </div>
    </nav>
  )

  if (page === 'landing') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-6 animate-fade-in">
              {t.hero.tagline}
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
              {t.hero.title1} <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                {t.hero.title2}
              </span>
            </h1>
            <p className="text-white/60 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {t.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigateTo('form')} className="h-14 px-10 rounded-2xl bg-primary text-background-dark text-lg font-bold hover:scale-105 transition-all shadow-[0_20px_60px_rgba(139,207,107,0.35)]">
                {t.hero.cta}
              </button>
              <button onClick={() => navigateTo('subscription')} className="h-14 px-10 rounded-2xl glass border border-white/10 text-white text-lg font-bold hover:bg-white/5 transition-all">
                {t.cta.premiumButton}
              </button>
            </div>
          </div>

          <section className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {t.features.list?.map((f: any, i: number) => (
              <div key={i} className="glass p-8 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group">
                <span className="material-symbols-outlined text-4xl text-primary mb-6">{f.icon}</span>
                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                <p className="text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    )
  }

  if (page === 'form') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-28 pb-12 px-6 max-w-xl mx-auto">
          <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">{t.form.title}</h2>
            <p className="text-white/50 mb-8">{t.form.description}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative w-full border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-primary/50 transition-all bg-white/5 p-4 text-center"
                   onClick={() => !loading && document.getElementById('photo-input')?.click()}>
                {photo ? (
                  <img src={photo} className="max-h-64 mx-auto rounded-lg" alt="Preview" />
                ) : (
                  <div className="py-12 text-white/40">
                    <span className="material-symbols-outlined text-5xl mb-2">add_a_photo</span>
                    <p className="font-semibold">{t.form.uploadPhoto}</p>
                  </div>
                )}
                <input id="photo-input" type="file" onChange={handlePhotoChange} accept="image/*" hidden />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block font-medium">{t.form.category}</label>
                <div className="grid grid-cols-2 gap-2">
                  {t.form.options.category.map((opt: any) => (
                    <button key={opt.value} type="button" onClick={() => setCategory(opt.value)}
                            className={`py-3 rounded-xl text-sm font-medium transition-all ${category === opt.value ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block font-medium">{t.form.targetMarket}</label>
                <input type="text" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} placeholder="e.g. Amazon USA, Shopify"
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none transition-all" />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block font-medium">{t.form.targetPrice}</label>
                <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="29.99"
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none transition-all" />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block font-medium">{t.form.units}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setUnitSystem('metric')}
                          className={`py-2 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'metric' ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10'}`}>
                    {t.form.metric}
                  </button>
                  <button type="button" onClick={() => setUnitSystem('imperial')}
                          className={`py-2 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'imperial' ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10'}`}>
                    {t.form.imperial}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full h-14 bg-primary text-background-dark rounded-xl font-extrabold text-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                {loading ? t.form.analyzing : t.form.submit}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  if (page === 'result') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-28 pb-12 px-6 max-w-4xl mx-auto">
          <div className="glass p-8 rounded-3xl border border-white/10 mb-8 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 text-primary">{t.result.title}</h2>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-white/80 font-body">
              {report}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => navigateTo('form')} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all">{t.result.tryAgain}</button>
            {user && (
              <button onClick={handleSendEmail} disabled={emailSending} className="flex-1 h-14 bg-white/10 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all">
                {emailSending ? 'Sending...' : t.result.sendEmail}
              </button>
            )}
            <button onClick={() => window.print()} className="flex-1 h-14 bg-primary text-background-dark rounded-xl font-bold hover:brightness-110 transition-all">{t.result.download}</button>
          </div>
        </main>
      </div>
    )
  }

  if (page === 'mypage') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-28 pb-12 px-6 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{t.mypage.title}</h2>
          
          <div className="glass p-8 rounded-3xl border border-white/10 mb-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">trending_up</span>
              {t.mypage.dailyRecTitle}
            </h3>
            {dailyRecLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
              </div>
            ) : dailyRec ? (
              <div className="whitespace-pre-wrap text-white/80 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5">
                {dailyRec.recommendation}
              </div>
            ) : (
              <p className="text-white/40">{t.mypage.dailyRecEmpty}</p>
            )}
            <button onClick={fetchDailyTrends} className="mt-4 text-primary text-sm font-semibold hover:underline">
              {t.mypage.dailyRecRefresh}
            </button>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/10">
            <h3 className="text-xl font-bold mb-6">{t.mypage.accountInfo}</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-white/5">
                <span className="text-white/40">{t.mypage.email}</span>
                <span className="text-white/80">{user?.email}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-white/40">{t.mypage.createdAt}</span>
                <span className="text-white/80">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (page === 'subscription') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">{t.subscription.title}</h2>
          <p className="text-white/60 text-xl mb-12">{t.subscription.description}</p>
          
          <div className="glass p-8 lg:p-12 rounded-[2.5rem] border border-primary/20 shadow-[0_0_80px_rgba(139,207,107,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <div className="text-5xl font-black text-primary">{t.subscription.pricing.price}</div>
              <div className="text-white/40 text-sm">{t.subscription.pricing.period}</div>
            </div>
            
            <div className="text-left space-y-8">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                <div>
                  <h4 className="font-bold text-lg">{t.subscription.features.daily}</h4>
                  <p className="text-white/50">{t.subscription.features.dailyDesc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                <div>
                  <h4 className="font-bold text-lg">{t.subscription.features.weather}</h4>
                  <p className="text-white/50">{t.subscription.features.weatherDesc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                <div>
                  <h4 className="font-bold text-lg">{t.subscription.features.personalized}</h4>
                  <p className="text-white/50">{t.subscription.features.personalizedDesc}</p>
                </div>
              </div>
            </div>
            
            <button onClick={handleSubscribe} disabled={loading} className="w-full h-16 bg-primary text-background-dark rounded-2xl font-black text-xl mt-12 hover:brightness-110 transition-all shadow-lg shadow-primary/20">
              {loading ? 'Processing...' : t.subscription.cta}
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background-dark text-white min-h-screen flex items-center justify-center p-6 text-center">
      <Navbar />
      <div className="glass p-12 rounded-3xl border border-white/10">
        <h2 className="text-3xl font-bold mb-4">404</h2>
        <button onClick={() => navigateTo('landing')} className="bg-primary text-background-dark px-8 py-3 rounded-xl font-bold">Back to Home</button>
      </div>
    </div>
  )
}

export default App
