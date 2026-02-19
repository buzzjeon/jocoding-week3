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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  // --- UI Components ---
  const GlobalNavbar = () => (
    <nav className="fixed top-0 w-full z-[100] glass border-b border-white/10 h-20 px-6">
      <div className="flex items-center h-full max-w-7xl mx-auto justify-between">
        {/* Logo */}
        <div onClick={() => navigateTo('landing')} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
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
            { label: 'Trends', target: 'mypage' },
            { label: 'About', target: 'about' },
          ].map((item) => (
            <button
              key={item.target}
              onClick={() => navigateTo(item.target as Page)}
              className={`text-sm font-bold tracking-tight transition-all hover:text-primary relative py-2 ${
                page === item.target ? 'text-primary' : 'text-white/60'
              }`}
            >
              {item.label}
              {page === item.target && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full animate-in fade-in zoom-in" />}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'en' ? 'ko' : 'en')} className="hidden sm:block text-white/40 text-[10px] font-black hover:text-white transition-colors border border-white/10 px-2 py-1 rounded-lg mr-2 uppercase">
            {lang}
          </button>
          
          <button 
            onClick={() => navigateTo('subscription')}
            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-background-dark px-4 py-2 rounded-xl text-xs font-black hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 active:scale-95 animate-pulse-slow"
          >
            <span className="material-symbols-outlined text-sm font-black">workspace_premium</span>
            GO PRO
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 bg-white/5 border border-white/10 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-all">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-primary text-lg">person</span>
                </div>
                <span className="text-white/80 text-xs font-bold hidden md:inline truncate max-w-[80px]">{user.email?.split('@')[0]}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-60 glass rounded-[1.5rem] border border-white/10 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-4 border-b border-white/5 mb-1 bg-white/5 rounded-t-xl">
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Seller Account</p>
                    <p className="text-white/80 text-xs font-bold truncate">{user.email}</p>
                  </div>
                  <button onClick={() => { navigateTo('mypage'); setShowUserMenu(false) }} className="w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all hover:translate-x-1">
                    <span className="material-symbols-outlined text-primary text-sm">dashboard</span> {t.mypage.title}
                  </button>
                  <button onClick={() => { navigateTo('subscription'); setShowUserMenu(false) }} className="w-full text-left px-4 py-3 text-amber-400 hover:bg-amber-400/5 rounded-xl text-sm font-bold flex items-center gap-3 transition-all hover:translate-x-1">
                    <span className="material-symbols-outlined text-sm">payments</span> Pro Seller Plan
                  </button>
                  <button onClick={async () => { await supabase.auth.signOut(); navigateTo('landing') }} className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-400/5 rounded-xl text-sm font-bold flex items-center gap-3 transition-all mt-1 border-t border-white/5">
                    <span className="material-symbols-outlined text-sm">logout</span> {t.login.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigateTo('login')} className="bg-white text-background-dark px-6 py-2.5 rounded-xl text-sm font-black hover:bg-primary transition-all active:scale-95">
              {t.login.login}
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-3xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-20 bg-background-dark/98 backdrop-blur-2xl z-[90] p-8 animate-in slide-in-from-right duration-300">
          <div className="flex flex-col gap-8 pt-10">
            {[
              { label: t.nav.home, target: 'landing', icon: 'home' },
              { label: 'Market Trends', target: 'mypage', icon: 'trending_up' },
              { label: 'Pro Pricing', target: 'subscription', icon: 'workspace_premium', highlight: true },
              { label: 'About Us', target: 'about', icon: 'info' },
            ].map((item) => (
              <button
                key={item.target}
                onClick={() => navigateTo(item.target as Page)}
                className={`flex items-center gap-5 text-3xl font-black transition-all ${item.highlight ? 'text-amber-400' : 'text-white/80'}`}
              >
                <span className={`material-symbols-outlined text-2xl ${item.highlight ? 'text-amber-400' : 'text-primary'}`}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {!user && (
              <button onClick={() => navigateTo('login')} className="mt-8 w-full bg-primary text-background-dark py-5 rounded-2xl font-black text-2xl shadow-xl shadow-primary/20">
                {t.login.login}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )

  const Footer = () => (
    <footer className="bg-background-dark border-t border-white/5 pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-background-dark text-xl font-black">rocket_launch</span>
            </div>
            <h2 className="text-white text-2xl font-black tracking-tighter">GlobalSell AI</h2>
          </div>
          <p className="text-white/40 text-lg max-w-sm mb-10 leading-relaxed font-medium">
            Empowering modern sellers with AI-driven vision and SEO intelligence. Join the global e-commerce revolution.
          </p>
          <div className="flex gap-5">
            {['𝕏', 'in', 'ig'].map(social => (
              <div key={social} className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-white/40 hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer transition-all">
                <span className="text-sm font-black uppercase">{social}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 col-span-1 md:col-span-2 gap-8">
          <div>
            <h4 className="text-white font-black mb-8 uppercase tracking-[0.2em] text-[10px]">Solutions</h4>
            <ul className="space-y-5 text-white/40 text-sm font-bold">
              <li onClick={() => navigateTo('form')} className="hover:text-primary cursor-pointer transition-colors">AI Listing Generator</li>
              <li onClick={() => navigateTo('mypage')} className="hover:text-primary cursor-pointer transition-colors">Market Trend Insight</li>
              <li onClick={() => navigateTo('subscription')} className="hover:text-primary cursor-pointer transition-colors text-amber-400">Pro Seller Plan</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-black mb-8 uppercase tracking-[0.2em] text-[10px]">Support</h4>
            <ul className="space-y-5 text-white/40 text-sm font-bold">
              <li onClick={() => navigateTo('faq')} className="hover:text-primary cursor-pointer transition-colors">Help Center</li>
              <li onClick={() => navigateTo('about')} className="hover:text-primary cursor-pointer transition-colors">Contact Us</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <p className="text-white/20 text-xs font-black tracking-widest uppercase italic">Built for the next generation of global sellers</p>
        <div className="flex gap-10 text-white/20 text-[10px] font-black uppercase tracking-widest">
          <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-white cursor-pointer transition-colors">Cookies</span>
        </div>
      </div>
    </footer>
  )

  // --- Render logic ---
  return (
    <div className="bg-background-dark text-white min-h-screen font-body flex flex-col selection:bg-primary selection:text-background-dark">
      <GlobalNavbar />
      
      <main className="flex-1 pt-20">
        {page === 'landing' && (
          <div className="pb-32">
            {/* Hero */}
            <div className="max-w-5xl mx-auto text-center px-6 pt-24 lg:pt-32">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.25em] uppercase mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {t.hero.tagline}
              </div>
              <h1 className="text-6xl lg:text-[6.5rem] font-black mb-10 tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                {t.hero.title1} <br />
                <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  {t.hero.title2}
                </span>
              </h1>
              <p className="text-white/50 text-xl lg:text-2xl max-w-3xl mx-auto mb-16 leading-relaxed font-bold tracking-tight animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300">
                {t.hero.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in fade-in slide-in-from-bottom-16 duration-700 delay-500">
                <button onClick={() => navigateTo('form')} className="h-20 px-14 rounded-[2rem] bg-primary text-background-dark text-2xl font-black hover:scale-105 transition-all shadow-[0_20px_80px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-3">
                  {t.hero.cta}
                  <span className="material-symbols-outlined font-black">arrow_forward</span>
                </button>
                <button onClick={() => navigateTo('subscription')} className="h-20 px-14 rounded-[2rem] glass border-2 border-white/10 text-white text-2xl font-black hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-3 group">
                  Pro Seller Plan
                  <span className="material-symbols-outlined text-amber-400 group-hover:rotate-12 transition-transform">workspace_premium</span>
                </button>
              </div>
            </div>

            {/* Daily Trend Preview */}
            <section className="mt-48 px-6 max-w-6xl mx-auto">
              <div className="glass p-12 lg:p-20 rounded-[4rem] border border-white/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent relative overflow-hidden group shadow-3xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] group-hover:bg-primary/20 transition-all duration-1000"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 relative z-10">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-4 text-primary mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl font-black">insights</span>
                      </div>
                      <span className="font-black uppercase tracking-[0.3em] text-xs">Today's AI Intelligence</span>
                    </div>
                    <h2 className="text-5xl lg:text-6xl font-black mb-6 tracking-tighter leading-tight">What's Trending <br/>In Global Markets?</h2>
                    <p className="text-white/40 text-xl font-bold tracking-tight">Unlock daily high-margin sourcing tips and keyword data with Pro.</p>
                  </div>
                  <button onClick={() => navigateTo('mypage')} className="bg-white text-background-dark hover:bg-primary px-10 py-5 rounded-[1.5rem] text-lg font-black transition-all flex items-center gap-4 active:scale-95 shadow-2xl">
                    Seller Dashboard <span className="material-symbols-outlined font-black">trending_up</span>
                  </button>
                </div>
                <div className="bg-background-dark/60 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 relative z-10 shadow-inner group-hover:border-primary/20 transition-all">
                  {dailyRecLoading ? (
                    <div className="animate-pulse space-y-5">
                      <div className="h-5 bg-white/10 rounded-full w-full"></div>
                      <div className="h-5 bg-white/10 rounded-full w-4/5"></div>
                      <div className="h-5 bg-white/10 rounded-full w-3/4"></div>
                    </div>
                  ) : dailyRec ? (
                    <div className="text-white/80 italic leading-relaxed text-2xl font-medium tracking-tight">
                      "{dailyRec.recommendation.substring(0, 300)}..."
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-6">
                      <p className="text-white/30 font-black text-xl italic text-center">Login to analyze real-time market opportunities.</p>
                      <button onClick={() => navigateTo('login')} className="text-primary font-black flex items-center gap-2 hover:underline">Get Access Now <span className="material-symbols-outlined">login</span></button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Feature Grid */}
            <section className="mt-48 px-6 max-w-7xl mx-auto">
              <div className="text-center mb-24">
                <h2 className="text-5xl lg:text-6xl font-black tracking-tighter mb-8">{t.features.title}</h2>
                <p className="text-white/40 text-xl max-w-3xl mx-auto font-bold tracking-tight">{t.features.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {t.features.list?.map((f: any, i: number) => (
                  <div key={i} className="glass p-12 rounded-[3rem] border border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden shadow-xl hover:-translate-y-2 duration-500">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-10 group-hover:bg-primary/10 transition-all group-hover:scale-110 shadow-lg">
                      <span className="material-symbols-outlined text-5xl text-primary font-black">{f.icon}</span>
                    </div>
                    <h3 className="text-3xl font-black mb-6 tracking-tight">{f.title}</h3>
                    <p className="text-white/40 leading-relaxed text-lg font-bold tracking-tight">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Professional Pricing Table */}
            <section className="mt-48 px-6 max-w-6xl mx-auto pb-20">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-black tracking-tighter mb-4">Pricing Built for Success</h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Choose the best plan for your global expansion</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="glass p-14 rounded-[3.5rem] border border-white/10 text-left flex flex-col group hover:border-white/20 transition-all">
                  <h3 className="text-2xl font-black mb-2 text-white/60">Free Trial</h3>
                  <div className="text-6xl font-black mb-12">$0 <span className="text-lg font-bold text-white/20">/ forever</span></div>
                  <ul className="space-y-8 flex-1">
                    {[
                      { text: '1 AI Listing per day', ok: true },
                      { text: 'Standard SEO optimization', ok: true },
                      { text: 'Market trend preview', ok: true },
                      { text: 'Multilingual exports', ok: false },
                      { text: 'Priority processing', ok: false },
                    ].map((item, i) => (
                      <li key={i} className={`flex items-center gap-5 text-lg font-bold ${item.ok ? 'text-white/60' : 'text-white/10'}`}>
                        <span className={`material-symbols-outlined text-2xl ${item.ok ? 'text-green-500' : 'text-white/10'}`}>{item.ok ? 'check_circle' : 'cancel'}</span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigateTo('form')} className="w-full h-20 mt-16 rounded-3xl border-2 border-white/10 font-black text-xl hover:bg-white/5 transition-all">Start Free</button>
                </div>

                <div className="glass p-14 rounded-[3.5rem] border-4 border-primary/40 text-left bg-gradient-to-br from-primary/10 via-transparent to-transparent relative overflow-hidden flex flex-col shadow-[0_0_120px_rgba(16,185,129,0.15)] group hover:scale-[1.02] transition-all">
                  <div className="absolute top-0 right-0 bg-primary text-background-dark px-10 py-3 font-black text-xs uppercase tracking-[0.3em] rounded-bl-[2rem] shadow-xl">Best Value</div>
                  <h3 className="text-2xl font-black mb-2 text-primary">Pro Seller</h3>
                  <div className="text-6xl font-black mb-12 text-white">$19 <span className="text-lg font-bold text-white/30">/ month</span></div>
                  <ul className="space-y-8 flex-1">
                    {[
                      { text: 'Unlimited AI Listings', icon: 'all_inclusive' },
                      { text: 'Premium Multi-platform SEO', icon: 'hub' },
                      { text: 'Full Daily Market Insights', icon: 'auto_graph' },
                      { text: 'All Multilingual Exports', icon: 'translate' },
                      { text: 'Priority 24/7 Support', icon: 'support_agent' },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-5 text-lg font-black text-white">
                        <span className="material-symbols-outlined text-2xl text-primary font-black">check_circle</span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigateTo('subscription')} className="w-full h-20 mt-16 bg-primary text-background-dark rounded-3xl font-black text-2xl hover:brightness-110 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-4">
                    <span className="material-symbols-outlined text-3xl font-black">bolt</span>
                    Unlock Pro Now
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {page === 'mypage' && (
          <div className="pt-24 pb-32 px-6 max-w-5xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6">
              <div>
                <h2 className="text-5xl font-black tracking-tighter mb-2">Seller Dashboard</h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Your global growth intelligence hub</p>
              </div>
              <div className="flex gap-4">
                <button onClick={fetchDailyTrends} className="w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-background-dark transition-all shadow-xl">
                  <span className="material-symbols-outlined font-black">refresh</span>
                </button>
                <button onClick={() => navigateTo('subscription')} className="bg-amber-500 text-background-dark px-8 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-amber-500/20 hover:scale-105 transition-all">
                  <span className="material-symbols-outlined font-black">stars</span>
                  Manage Pro
                </button>
              </div>
            </header>
            
            <div className="glass p-12 lg:p-16 rounded-[4rem] border border-white/10 mb-12 shadow-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent relative overflow-hidden group">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-3xl font-black">trending_up</span>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">{t.mypage.dailyRecTitle}</h3>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mt-4 md:mt-0">Pro Access Verified</div>
              </div>
              
              {dailyRecLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-6 bg-white/5 rounded-full w-full"></div>
                  <div className="h-6 bg-white/5 rounded-full w-5/6"></div>
                  <div className="h-6 bg-white/5 rounded-full w-4/5"></div>
                </div>
              ) : dailyRec ? (
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed bg-background-dark/50 p-10 rounded-[2.5rem] border border-white/5 font-body text-xl font-bold italic tracking-tight shadow-inner">
                  {dailyRec.recommendation}
                </div>
              ) : (
                <div className="text-center py-24 bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/10">
                  <span className="material-symbols-outlined text-6xl text-white/10 mb-6">lock_open</span>
                  <p className="text-white/30 mb-10 text-xl font-black tracking-tight max-w-sm mx-auto">{t.mypage.dailyRecEmpty}</p>
                  <button onClick={() => navigateTo('subscription')} className="bg-primary text-background-dark px-12 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-all">Unlock Premium Data</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="glass p-12 rounded-[3.5rem] border border-white/10 group hover:border-white/20 transition-all">
                <h3 className="text-xl font-black mb-10 border-b border-white/5 pb-6 uppercase tracking-[0.2em] text-[10px] text-white/40">Account Information</h3>
                <div className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">Global ID</span>
                    <span className="text-white text-xl font-black truncate">{user?.email}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">Active Since</span>
                    <span className="text-white text-xl font-black">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>
              <div className="glass p-12 rounded-[3.5rem] border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary font-black">verified</span>
                    <h3 className="text-2xl font-black">Pro Merchant</h3>
                  </div>
                  <p className="text-white/40 text-lg font-bold tracking-tight mb-10">You have full access to AI tools and international market data.</p>
                </div>
                <button onClick={() => navigateTo('landing')} className="w-full py-5 bg-white text-background-dark rounded-2xl font-black text-lg hover:bg-primary transition-all shadow-xl">New Analysis</button>
              </div>
            </div>
          </div>
        )}

        {(page === 'login' || page === 'signup') && (
          <div className="pt-24 pb-32 flex items-center justify-center px-6 min-h-[calc(100vh-80px)]">
            <div className="glass p-12 lg:p-16 rounded-[4rem] border border-white/10 w-full max-w-lg shadow-3xl relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
              <h2 className="text-5xl font-black mb-4 text-center tracking-tighter">{page === 'login' ? t.login.login : t.login.signup}</h2>
              <p className="text-white/40 text-center mb-12 font-bold tracking-tight text-lg">{page === 'login' ? 'Welcome back to GlobalSell AI.' : 'Start your global e-commerce journey.'}</p>
              
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
                setLoading(true);
                if (page === 'login') {
                  const { error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) alert(error.message); else navigateTo('mypage');
                } else {
                  const { error } = await supabase.auth.signUp({ email, password });
                  if (error) alert(error.message); else alert('Welcome! Please check your email.');
                }
                setLoading(false);
              }}>
                <div>
                  <label className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ml-2">Email Identity</label>
                  <input name="email" type="email" placeholder="merchant@globalsell.ai" required className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-5 text-white font-black outline-none focus:border-primary/50 transition-all text-lg placeholder:text-white/10" />
                </div>
                <div>
                  <label className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ml-2">Access Key</label>
                  <input name="password" type="password" placeholder="••••••••" required className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-5 text-white font-black outline-none focus:border-primary/50 transition-all text-lg placeholder:text-white/10" />
                </div>
                <button type="submit" disabled={loading} className="w-full h-20 bg-primary text-background-dark rounded-[1.5rem] font-black text-2xl mt-6 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                  {loading ? 'Authenticating...' : (page === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT')}
                </button>
              </form>
              
              <div className="mt-12 pt-10 border-t border-white/5 text-center">
                <p className="text-white/30 font-bold text-lg tracking-tight">
                  {page === 'login' ? "New to the platform?" : "Already a merchant?"}
                  <button onClick={() => navigateTo(page === 'login' ? 'signup' : 'login')} className="ml-3 text-primary font-black hover:underline decoration-2 underline-offset-8">
                    {page === 'login' ? 'Join Now' : 'Sign In'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {page === 'subscription' && (
          <div className="pt-24 pb-32 px-6 max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-black tracking-[0.3em] uppercase mb-10">
              <span className="material-symbols-outlined text-sm font-black">workspace_premium</span>
              Exclusive Seller Benefit
            </div>
            <h2 className="text-6xl lg:text-7xl font-black mb-8 tracking-tighter leading-tight">Scale Without Limits</h2>
            <p className="text-white/40 text-xl lg:text-2xl mb-24 max-w-3xl mx-auto font-bold tracking-tight leading-relaxed">
              Unlock the full power of AI vision and global market intelligence to dominate international marketplaces.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch max-w-5xl mx-auto">
              {/* Free Card (Smaller) */}
              <div className="glass p-12 lg:p-16 rounded-[4rem] border border-white/10 text-left flex flex-col group opacity-60 hover:opacity-100 transition-all scale-95 hover:scale-100">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-3xl font-black tracking-tight mb-2">Free Starter</h3>
                    <p className="text-white/40 font-bold text-sm uppercase">Basic Listing Tool</p>
                  </div>
                  <div className="text-4xl font-black">$0</div>
                </div>
                <ul className="space-y-8 flex-1">
                  {[
                    { text: '1 AI Listing per day', ok: true },
                    { text: 'Standard SEO results', ok: true },
                    { text: 'Basic market insights', ok: true },
                    { text: 'Global exports', ok: false },
                  ].map((item, i) => (
                    <li key={i} className={`flex items-center gap-5 text-lg font-bold ${item.ok ? 'text-white/60' : 'text-white/10'}`}>
                      <span className={`material-symbols-outlined text-2xl ${item.ok ? 'text-green-500' : 'text-white/10'}`}>{item.ok ? 'check_circle' : 'cancel'}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigateTo('form')} className="w-full h-20 mt-16 rounded-[2rem] border-2 border-white/10 font-black text-xl hover:bg-white/5 transition-all">Current Plan</button>
              </div>

              {/* Pro Card (Massive & Glowing) */}
              <div className="glass p-12 lg:p-16 rounded-[4rem] border-4 border-primary/50 text-left bg-gradient-to-br from-primary/20 via-transparent to-background-dark relative overflow-hidden flex flex-col shadow-[0_0_150px_rgba(16,185,129,0.2)] group transform scale-105 active:scale-100 transition-all">
                <div className="absolute top-0 right-0 bg-primary text-background-dark px-12 py-4 font-black text-sm uppercase tracking-[0.4em] rounded-bl-[3rem] shadow-2xl">Recommended</div>
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-4xl font-black tracking-tighter mb-2 text-white">Pro Seller</h3>
                    <p className="text-primary font-black text-sm uppercase tracking-widest">Global Expansion Hub</p>
                  </div>
                  <div className="text-right">
                    <div className="text-6xl font-black text-white">$19</div>
                    <div className="text-white/30 text-xs font-black uppercase tracking-widest mt-1">per month</div>
                  </div>
                </div>
                <ul className="space-y-8 flex-1">
                  {[
                    { text: 'Unlimited AI Listings', icon: 'bolt' },
                    { text: 'Premium SEO Intelligence', icon: 'hub' },
                    { text: 'Full Daily Market Trends', icon: 'auto_graph' },
                    { text: 'Unlimited Global Exports', icon: 'public' },
                    { text: '24/7 Seller Priority', icon: 'support_agent' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-6 text-xl font-black text-white group-hover:translate-x-2 transition-transform duration-300">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <span className="material-symbols-outlined text-primary font-black text-xl">check</span>
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={async () => {
                    if (!user) { navigateTo('login'); return; }
                    setLoading(true);
                    try {
                      const res = await fetch('/api/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, email: user.email, lang }),
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                    } catch { alert('Network error'); }
                    finally { setLoading(false); }
                  }}
                  disabled={loading} 
                  className="w-full h-24 mt-16 bg-primary text-background-dark rounded-[2rem] font-black text-3xl hover:scale-[1.03] hover:brightness-110 transition-all shadow-[0_20px_80px_rgba(16,185,129,0.5)] flex items-center justify-center gap-5"
                >
                  {loading ? 'WAITING...' : (
                    <>
                      <span className="material-symbols-outlined text-4xl font-black">flash_on</span>
                      GO PRO NOW
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <p className="mt-20 text-white/20 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4">
              <span className="material-symbols-outlined text-xl">verified_user</span> 
              Secure Merchant Billing Powered by Polar.sh
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
