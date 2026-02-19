import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { translations } from './lib/translations'
import type { User } from '@supabase/supabase-js'

type Page = 'landing' | 'form' | 'result' | 'payment-success' | 'login' | 'signup' | 'mypage' | 'subscription' | 'about' | 'faq'
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
  about: '/about',
  faq: '/faq',
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
    window.scrollTo(0, 0)
    setIsMobileMenuOpen(false)
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [user, setUser] = useState<User | null>(null)
  const [dailyRec, setDailyRec] = useState<{ recommendation_date: string; recommendation: string } | null>(null)
  const [dailyRecLoading, setDailyRecLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

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
    if ((page === 'mypage' || page === 'landing') && user) fetchDailyTrends()
  }, [page, user])

  // --- Reusable Navigation Component ---
  const GlobalNavbar = () => (
    <nav className="fixed top-0 w-full z-[100] glass border-b border-white/10 h-20">
      <div className="flex items-center h-full px-6 justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div onClick={() => navigateTo('landing')} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-background-dark font-black">rocket_launch</span>
          </div>
          <h1 className="text-white text-xl font-black tracking-tighter">
            GlobalSell <span className="text-primary">AI</span>
          </h1>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-10">
          {[
            { label: t.nav.home, target: 'landing' },
            { label: t.nav.browse, target: 'mypage' },
            { label: 'Pricing', target: 'subscription' },
            { label: 'About', target: 'about' },
          ].map((item) => (
            <button
              key={item.target}
              onClick={() => navigateTo(item.target as Page)}
              className={`text-sm font-bold tracking-tight transition-all hover:text-primary ${
                page === item.target ? 'text-primary' : 'text-white/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'en' ? 'ko' : 'en')} className="text-white/40 text-xs font-black hover:text-white transition-colors border border-white/10 px-2 py-1 rounded-lg">
            {lang.toUpperCase()}
          </button>
          
          {user ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 bg-white/5 border border-white/10 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-all">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">person</span>
                </div>
                <span className="text-white/80 text-xs font-bold truncate max-w-[80px]">{user.email?.split('@')[0]}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 glass rounded-2xl border border-white/10 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Logged in as</p>
                    <p className="text-white/80 text-xs font-bold truncate">{user.email}</p>
                  </div>
                  <button onClick={() => { navigateTo('mypage'); setShowUserMenu(false) }} className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors">
                    <span className="material-symbols-outlined text-sm">dashboard</span> {t.mypage.title}
                  </button>
                  <button onClick={() => { navigateTo('subscription'); setShowUserMenu(false) }} className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors">
                    <span className="material-symbols-outlined text-sm">workspace_premium</span> Pro Seller Plan
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-400/5 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors mt-1 border-t border-white/5">
                    <span className="material-symbols-outlined text-sm">logout</span> {t.login.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigateTo('login')} className="bg-primary text-background-dark px-6 py-2.5 rounded-xl text-sm font-black hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-primary/20">
              {t.login.login}
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-3xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-20 bg-background-dark/95 backdrop-blur-xl z-[90] p-8 animate-in fade-in slide-in-from-right w-full">
          <div className="flex flex-col gap-6">
            {[
              { label: t.nav.home, target: 'landing', icon: 'home' },
              { label: t.nav.browse, target: 'mypage', icon: 'trending_up' },
              { label: 'Pricing', target: 'subscription', icon: 'payments' },
              { label: 'About Us', target: 'about', icon: 'info' },
              { label: 'FAQ', target: 'faq', icon: 'help' },
            ].map((item) => (
              <button
                key={item.target}
                onClick={() => navigateTo(item.target as Page)}
                className="flex items-center gap-4 text-2xl font-bold text-white/80 hover:text-primary transition-all text-left"
              >
                <span className="material-symbols-outlined text-primary">{item.icon}</span>
                {item.label}
              </button>
            ))}
            {!user && (
              <button onClick={() => navigateTo('login')} className="mt-4 w-full bg-primary text-background-dark py-4 rounded-2xl font-black text-xl">
                {t.login.login}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )

  const Footer = () => (
    <footer className="bg-background-dark border-t border-white/5 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-background-dark text-lg font-black">rocket_launch</span>
            </div>
            <h2 className="text-white text-lg font-black tracking-tighter">GlobalSell AI</h2>
          </div>
          <p className="text-white/40 text-sm max-w-sm mb-8 leading-relaxed">
            The world's most advanced AI assistant for global e-commerce sellers. Dominate international markets with precision SEO.
          </p>
          <div className="flex gap-4">
            {['facebook', 'X', 'linkedin'].map(social => (
              <div key={social} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:border-primary hover:text-primary cursor-pointer transition-all">
                <span className="text-xs font-black">{social[0]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Product</h4>
          <ul className="space-y-4 text-white/40 text-sm">
            <li onClick={() => navigateTo('landing')} className="hover:text-primary cursor-pointer transition-colors">Analyzer</li>
            <li onClick={() => navigateTo('mypage')} className="hover:text-primary cursor-pointer transition-colors">Trends</li>
            <li onClick={() => navigateTo('subscription')} className="hover:text-primary cursor-pointer transition-colors">Pricing</li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Company</h4>
          <ul className="space-y-4 text-white/40 text-sm">
            <li onClick={() => navigateTo('about')} className="hover:text-primary cursor-pointer transition-colors">About Us</li>
            <li onClick={() => navigateTo('faq')} className="hover:text-primary cursor-pointer transition-colors">FAQ</li>
            <li className="hover:text-primary cursor-pointer transition-colors">Contact</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-white/20 text-xs font-medium">© 2026 GlobalSell AI. All rights reserved.</p>
        <div className="flex gap-8 text-white/20 text-xs font-medium">
          <span className="hover:text-white cursor-pointer">Privacy</span>
          <span className="hover:text-white cursor-pointer">Terms</span>
          <span className="hover:text-white cursor-pointer">Refund</span>
        </div>
      </div>
    </footer>
  )

  // --- Page Handlers ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photo || !category || !targetMarket || !targetPrice) {
      alert(t.errors.fillAll)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo, gender: category, height: targetMarket, weight: targetPrice, unitSystem, lang }),
      })
      const data = await res.json()
      if (data.error) alert(t.errors.apiError + data.error)
      else { setReport(data.report); navigateTo('result'); }
    } catch { alert(t.errors.connectionFailed) }
    finally { setLoading(false) }
  }

  const handleEmailListing = async () => {
    if (!user?.email || !report) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, report, lang }),
      })
      if (res.ok) alert(t.result.emailSent)
    } catch { alert(t.errors.connectionFailed) }
    finally { setEmailSending(false) }
  }

  const handleProSubscribe = async () => {
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
    } catch { alert(t.errors.connectionFailed) }
    finally { setLoading(false) }
  }

  // --- Main Render Switch ---
  return (
    <div className="bg-background-dark text-white min-h-screen font-body flex flex-col">
      <GlobalNavbar />
      
      <main className="flex-1 pt-20">
        {page === 'landing' && (
          <div className="pb-20">
            {/* Hero */}
            <div className="max-w-4xl mx-auto text-center px-6 pt-20">
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-8 animate-fade-in">
                {t.hero.tagline}
              </div>
              <h1 className="text-5xl lg:text-[5rem] font-black mb-8 tracking-tighter leading-[0.95]">
                {t.hero.title1} <br />
                <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  {t.hero.title2}
                </span>
              </h1>
              <p className="text-white/50 text-lg lg:text-2xl max-w-2xl mx-auto mb-14 leading-relaxed font-medium">
                {t.hero.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button onClick={() => navigateTo('form')} className="h-16 px-12 rounded-2xl bg-primary text-background-dark text-xl font-black hover:scale-105 transition-all shadow-[0_20px_60px_rgba(139,207,107,0.3)] active:scale-95">
                  {t.hero.cta}
                </button>
                <button onClick={() => navigateTo('subscription')} className="h-16 px-12 rounded-2xl glass border border-white/10 text-white text-xl font-black hover:bg-white/5 transition-all active:scale-95">
                  View Pro Plan
                </button>
              </div>
            </div>

            {/* Trends Section */}
            <section className="mt-40 px-6 max-w-6xl mx-auto">
              <div className="glass p-10 lg:p-16 rounded-[3.5rem] border border-white/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 relative z-10">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3 text-primary mb-4">
                      <span className="material-symbols-outlined text-3xl">trending_up</span>
                      <span className="font-black uppercase tracking-widest text-xs">Global Market Insight</span>
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tighter leading-tight">What's selling <br/>today?</h2>
                    <p className="text-white/40 text-lg font-medium">Get daily AI-driven reports on rising categories and keywords.</p>
                  </div>
                  <button onClick={() => navigateTo('mypage')} className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl border border-white/10 text-white font-black transition-all flex items-center gap-3 active:scale-95">
                    Explore Dashboard <span className="material-symbols-outlined">arrow_right_alt</span>
                  </button>
                </div>
                <div className="bg-background-dark/50 p-8 rounded-[2rem] border border-white/5 relative z-10">
                  {dailyRecLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-white/10 rounded w-full"></div>
                      <div className="h-4 bg-white/10 rounded w-2/3"></div>
                    </div>
                  ) : dailyRec ? (
                    <div className="text-white/70 italic leading-relaxed text-lg font-body font-medium">
                      {dailyRec.recommendation.substring(0, 250)}...
                    </div>
                  ) : (
                    <p className="text-white/30 font-medium italic">Login to see today's exclusive market trend.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Feature Grid */}
            <section className="mt-40 px-6 max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6">{t.features.title}</h2>
                <p className="text-white/40 text-lg max-w-2xl mx-auto font-medium">{t.features.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {t.features.list?.map((f: any, i: number) => (
                  <div key={i} className="glass p-10 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                      <span className="material-symbols-outlined text-4xl text-primary">{f.icon}</span>
                    </div>
                    <h3 className="text-2xl font-black mb-4 tracking-tight">{f.title}</h3>
                    <p className="text-white/40 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {page === 'form' && (
          <div className="pt-20 pb-20 px-6 max-w-2xl mx-auto">
            <div className="glass p-10 lg:p-14 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <span className="material-symbols-outlined text-[120px] text-primary">add_a_photo</span>
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">{t.form.title}</h2>
              <p className="text-white/40 mb-10 font-medium">{t.form.description}</p>
              
              <form onSubmit={handleFormSubmit} className="space-y-10 relative z-10">
                <div className="relative w-full border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-primary/50 transition-all bg-white/5 p-6 text-center"
                     onClick={() => !loading && document.getElementById('photo-input')?.click()}>
                  {photo ? (
                    <img src={photo} className="max-h-80 mx-auto rounded-2xl shadow-2xl" alt="Preview" />
                  ) : (
                    <div className="py-16 text-white/30 group">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10 transition-all">
                        <span className="material-symbols-outlined text-5xl text-primary">photo_camera</span>
                      </div>
                      <p className="font-black text-xl tracking-tight mb-2">Click to upload photo</p>
                      <p className="text-sm font-medium">Clear photo of the item you want to sell</p>
                    </div>
                  )}
                  <input id="photo-input" type="file" onChange={handlePhotoUpload} accept="image/*" hidden />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-white/60 text-xs font-black uppercase tracking-widest mb-3 block">{t.form.category}</label>
                    <div className="grid grid-cols-1 gap-2">
                      {t.form.options.category.map((opt: any) => (
                        <button key={opt.value} type="button" onClick={() => setCategory(opt.value)}
                                className={`py-3.5 px-4 rounded-xl text-sm font-bold transition-all text-left flex justify-between items-center ${category === opt.value ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>
                          {opt.label}
                          {category === opt.value && <span className="material-symbols-outlined text-sm">check_circle</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <label className="text-white/60 text-xs font-black uppercase tracking-widest mb-3 block">{t.form.targetMarket}</label>
                      <input type="text" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} placeholder="e.g. Amazon US"
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-primary/50 outline-none transition-all placeholder:text-white/10" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs font-black uppercase tracking-widest mb-3 block">{t.form.targetPrice}</label>
                      <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="29.99"
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-primary/50 outline-none transition-all placeholder:text-white/10" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs font-black uppercase tracking-widest mb-3 block">{t.form.units}</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setUnitSystem('metric')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${unitSystem === 'metric' ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                          Professional
                        </button>
                        <button type="button" onClick={() => setUnitSystem('imperial')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${unitSystem === 'imperial' ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                          Creative
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-background-dark rounded-2xl font-black text-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4">
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-4 border-background-dark/20 border-t-background-dark rounded-full animate-spin"></div>
                      {t.form.analyzing}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined font-black">magic_button</span>
                      {t.form.submit}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {page === 'result' && (
          <div className="pt-20 pb-20 px-6 max-w-5xl mx-auto">
            <div className="glass p-10 lg:p-16 rounded-[3.5rem] border border-white/10 mb-10 shadow-2xl relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-white/5 pb-8">
                <div>
                  <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-2">{t.result.title}</h2>
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">{t.result.description}</p>
                </div>
                <div className="flex gap-3">
                  {user && (
                    <button onClick={handleEmailListing} disabled={emailSending} className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">mail</span> {emailSending ? 'Sending...' : 'Email'}
                    </button>
                  )}
                  <button onClick={() => window.print()} className="h-12 px-6 bg-primary text-background-dark rounded-xl font-black hover:brightness-110 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg font-black">download</span> {t.result.download}
                  </button>
                </div>
              </div>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-white/80 font-body text-lg">
                {report}
              </div>
            </div>
            <button onClick={() => navigateTo('form')} className="w-full h-16 glass border border-white/10 rounded-2xl font-black text-xl hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">refresh</span>
              {t.result.tryAgain}
            </button>
          </div>
        )}

        {page === 'mypage' && (
          <div className="pt-20 pb-20 px-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-black tracking-tighter">{t.mypage.title}</h2>
              <button onClick={fetchDailyTrends} className="w-12 h-12 rounded-full glass border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-background-dark transition-all">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
            
            <div className="glass p-10 rounded-[3rem] border border-white/10 mb-10 shadow-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{t.mypage.dailyRecTitle}</h3>
                </div>
                <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest">Pro Member Only</span>
              </div>
              {dailyRecLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                  <div className="h-4 bg-white/10 rounded w-5/6"></div>
                  <div className="h-4 bg-white/10 rounded w-4/5"></div>
                </div>
              ) : dailyRec ? (
                <div className="whitespace-pre-wrap text-white/70 leading-relaxed bg-background-dark/40 p-8 rounded-3xl border border-white/5 font-body text-lg font-medium italic">
                  {dailyRec.recommendation}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                  <p className="text-white/30 mb-8 font-bold">{t.mypage.dailyRecEmpty}</p>
                  <button onClick={() => navigateTo('subscription')} className="bg-primary text-background-dark px-10 py-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-105 transition-all">Unlock Premium Trends</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-10 rounded-[2.5rem] border border-white/10">
                <h3 className="text-xl font-black mb-8 border-b border-white/5 pb-4 uppercase tracking-widest text-xs text-white/40">{t.mypage.accountInfo}</h3>
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-white/30 text-xs font-bold uppercase tracking-tighter">Email Address</span>
                    <span className="text-white text-lg font-black truncate">{user?.email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/30 text-xs font-bold uppercase tracking-tighter">Joined Date</span>
                    <span className="text-white font-black">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>
              <div className="glass p-10 rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black mb-2">Pro Seller Status</h3>
                  <p className="text-white/40 text-sm font-medium mb-8">Access unlimited AI listings and market data.</p>
                </div>
                <button onClick={() => navigateTo('subscription')} className="w-full py-4 bg-primary/10 border border-primary/20 text-primary rounded-2xl font-black hover:bg-primary hover:text-background-dark transition-all">Manage Subscription</button>
              </div>
            </div>
          </div>
        )}

        {page === 'subscription' && (
          <div className="pt-20 pb-20 px-6 max-w-5xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-8">
              Pricing & Plans
            </div>
            <h2 className="text-5xl lg:text-[4rem] font-black mb-6 tracking-tighter leading-tight">{t.subscription.title}</h2>
            <p className="text-white/40 text-xl mb-20 max-w-2xl mx-auto font-medium">{t.subscription.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              <div className="glass p-12 rounded-[3.5rem] border border-white/5 text-left flex flex-col">
                <h3 className="text-2xl font-black mb-2">Free Starter</h3>
                <div className="text-5xl font-black mb-10">$0 <span className="text-sm font-medium text-white/20">/ month</span></div>
                <ul className="space-y-6 flex-1">
                  {[
                    { text: '1 AI Listing per day', active: true },
                    { text: 'Standard SEO optimization', active: true },
                    { text: 'Market trend preview', active: true },
                    { text: 'Multilingual exports', active: false },
                    { text: 'Priority AI processing', active: false },
                  ].map((item, i) => (
                    <li key={i} className={`flex items-center gap-4 text-sm font-bold ${item.active ? 'text-white/60' : 'text-white/10'}`}>
                      <span className={`material-symbols-outlined text-lg ${item.active ? 'text-green-500' : 'text-white/10'}`}>
                        {item.active ? 'check_circle' : 'cancel'}
                      </span>
                      {item.text}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigateTo('form')} className="w-full h-16 mt-12 rounded-2xl border border-white/10 font-black text-lg hover:bg-white/5 transition-all active:scale-95">Get Started</button>
              </div>

              <div className="glass p-12 rounded-[3.5rem] border-2 border-primary/30 text-left bg-gradient-to-br from-primary/10 via-transparent to-transparent relative overflow-hidden flex flex-col shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                <div className="absolute top-0 right-0 bg-primary text-background-dark px-8 py-2 font-black text-[10px] uppercase tracking-[0.2em] rounded-bl-3xl">Most Popular</div>
                <h3 className="text-2xl font-black mb-2 text-primary">Pro Seller</h3>
                <div className="text-5xl font-black mb-10">$19 <span className="text-sm font-medium text-white/20">/ month</span></div>
                <ul className="space-y-6 flex-1">
                  {[
                    { text: 'Unlimited AI Listings', active: true },
                    { text: 'Premium Multi-platform SEO', active: true },
                    { text: 'Full Daily Market Trends', active: true },
                    { text: 'All Multilingual Exports', active: true },
                    { text: 'Priority Support', active: true },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm font-bold text-white/80">
                      <span className="material-symbols-outlined text-lg text-primary font-black">check_circle</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
                <button onClick={handleProSubscribe} disabled={loading} className="w-full h-16 mt-12 bg-primary text-background-dark rounded-2xl font-black text-xl hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
                  {loading ? 'Processing...' : (
                    <>
                      <span className="material-symbols-outlined font-black">bolt</span>
                      {t.subscription.cta}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {(page === 'login' || page === 'signup') && (
          <div className="pt-20 pb-20 flex items-center justify-center px-6 min-h-[calc(100vh-80px)]">
            <div className="glass p-10 lg:p-14 rounded-[3rem] border border-white/10 w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
              <h2 className="text-4xl font-black mb-4 text-center tracking-tighter">{page === 'login' ? t.login.login : t.login.signup}</h2>
              <p className="text-white/40 text-center mb-10 font-medium">{page === 'login' ? 'Welcome back, seller!' : 'Join the global e-commerce revolution.'}</p>
              
              <form className="space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
                setLoading(true);
                if (page === 'login') {
                  const { error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) alert(error.message); else navigateTo('mypage');
                } else {
                  const { error } = await supabase.auth.signUp({ email, password });
                  if (error) alert(error.message); else alert('Success! Please verify your email.');
                }
                setLoading(false);
              }}>
                <div>
                  <label className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2 block ml-1">Email Address</label>
                  <input name="email" type="email" placeholder="seller@example.com" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2 block ml-1">Password</label>
                  <input name="password" type="password" placeholder="••••••••" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-primary/50 transition-all" />
                </div>
                <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-background-dark rounded-2xl font-black text-xl mt-4 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
                  {loading ? 'Processing...' : (page === 'login' ? t.login.login : t.login.signup)}
                </button>
              </form>
              
              <div className="mt-10 pt-8 border-t border-white/5 text-center">
                <p className="text-white/30 font-medium text-sm">
                  {page === 'login' ? "New to GlobalSell AI?" : "Already have an account?"}
                  <button onClick={() => navigateTo(page === 'login' ? 'signup' : 'login')} className="ml-2 text-primary font-black hover:underline underline-offset-4 transition-all">
                    {page === 'login' ? t.login.signup : t.login.login}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
