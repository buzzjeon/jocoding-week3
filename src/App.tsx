import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { translations } from './lib/translations'
import type { User } from '@supabase/supabase-js'

type Page = 'landing' | 'brand-setup' | 'brand-report' | 'payment-success' | 'terms' | 'privacy' | 'refund' | 'login' | 'signup' | 'mypage' | 'forgot-password' | 'reset-password' | 'subscription' | 'subscription-success' | 'partnership' | 'about' | 'faq'
type Language = 'en' | 'ko'

const getInitialLang = (): Language => {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem('brandforge-lang')
  if (stored === 'en' || stored === 'ko') return stored
  const nav = window.navigator.language?.toLowerCase() || ''
  return nav.startsWith('ko') ? 'ko' : 'en'
}

const pageRoutes: Record<Page, string> = {
  landing: '/',
  'brand-setup': '/brand-setup',
  'brand-report': '/brand-report',
  'payment-success': '/payment-success',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  login: '/login',
  signup: '/signup',
  mypage: '/mypage',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  subscription: '/subscription',
  'subscription-success': '/subscription-success',
  partnership: '/partnership',
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
  }

  const [lang, setLang] = useState<Language>(getInitialLang)

  // Brand setup states
  const [photo, setPhoto] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [brandTone, setBrandTone] = useState('professional')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [brandDescription, setBrandDescription] = useState('')

  // Report states
  const [report, setReport] = useState('')
  const [marketingVisual, setMarketingVisual] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Mypage states
  const [dailyRec, setDailyRec] = useState<{ recommendation_date: string; recommendation: string } | null>(null)
  const [dailyRecLoading, setDailyRecLoading] = useState(false)

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('brandforge-lang', lang)
    }
  }, [lang])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const togglePlatform = (value: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandName || !industry || !targetAudience) {
      alert(t.errors.fillAll)
      return
    }

    setLoading(true)
    setReport('')
    setMarketingVisual(null)
    try {
      const response = await fetch('/api/brand-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo,
          brandName,
          industry,
          targetAudience,
          brandTone,
          platforms: selectedPlatforms,
          brandDescription,
          lang,
        }),
      })

      const data = await response.json()
      if (data.error) {
        alert(t.errors.apiError + data.error)
      } else {
        setReport(data.report)
        if (data.marketingVisual) {
          setMarketingVisual(data.marketingVisual)
        }
        navigateTo('brand-report')
      }
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

  const fetchDailyContent = async () => {
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
    if (page === 'mypage' && user) fetchDailyContent()
  }, [page, user])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSection = (id: string) => {
    if (page !== 'landing') navigateTo('landing')
    setMobileMenuOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // --- UI Components ---
  const Navbar = () => (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
        <h1 onClick={() => navigateTo('landing')} className="text-white text-xl font-extrabold tracking-tight cursor-pointer">
          Brand<span className="text-primary text-2xl">Forge</span> <span className="text-white/60 text-base font-medium">AI</span>
        </h1>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('services')} className="text-white/60 text-sm hover:text-white transition-colors">{t.nav.brandAnalysis}</button>
          <button onClick={() => scrollToSection('services')} className="text-white/60 text-sm hover:text-white transition-colors">{t.nav.dailyContent}</button>
          <button onClick={() => scrollToSection('pricing')} className="text-white/60 text-sm hover:text-white transition-colors">{t.nav.pricing}</button>
          {user && (
            <button onClick={() => navigateTo('mypage')} className="text-white/60 text-sm hover:text-white transition-colors">{t.nav.mypage}</button>
          )}
        </div>

        <div className="flex items-center gap-3">
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
          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden w-9 h-9 flex items-center justify-center text-white/60 hover:text-white">
            <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/10 p-4 space-y-2">
          <button onClick={() => scrollToSection('services')} className="block w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl text-sm">{t.nav.brandAnalysis}</button>
          <button onClick={() => scrollToSection('services')} className="block w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl text-sm">{t.nav.dailyContent}</button>
          <button onClick={() => scrollToSection('pricing')} className="block w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl text-sm">{t.nav.pricing}</button>
          {user && (
            <button onClick={() => { navigateTo('mypage'); setMobileMenuOpen(false) }} className="block w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl text-sm">{t.nav.mypage}</button>
          )}
        </div>
      )}
    </nav>
  )

  // --- Render Pages ---

  // Landing Page
  if (page === 'landing') {
    const svc = t.services
    const proc = t.process
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />

        {/* Hero */}
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
            <button onClick={() => scrollToSection('services')} className="h-14 px-10 rounded-2xl bg-primary text-background-dark text-lg font-bold hover:scale-105 transition-all">
              {t.hero.cta}
            </button>

            {/* Stats */}
            <div className="flex justify-center gap-12 mt-16 text-center">
              <div>
                <div className="text-3xl font-extrabold text-primary">5K+</div>
                <div className="text-white/40 text-sm mt-1">{lang === 'ko' ? '브랜드 분석' : 'Brands analyzed'}</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-primary">30s</div>
                <div className="text-white/40 text-sm mt-1">{lang === 'ko' ? '브랜드 리포트' : 'Brand report'}</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-primary">6</div>
                <div className="text-white/40 text-sm mt-1">{lang === 'ko' ? '플랫폼 지원' : 'Platforms'}</div>
              </div>
            </div>
          </div>

          {/* Two Services Section */}
          <section id="services" className="mt-32 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{svc.sectionTitle}</h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">{svc.sectionDesc}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="pricing">
              {/* Service 1: Brand Analysis (One-Time) */}
              <div className="glass rounded-3xl border border-white/10 hover:border-primary/30 transition-all overflow-hidden flex flex-col">
                <div className="bg-primary/5 border-b border-white/5 px-8 pt-8 pb-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4">{svc.analysis.badge}</span>
                  <h3 className="text-2xl font-extrabold mb-2">{svc.analysis.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{svc.analysis.desc}</p>
                </div>
                <div className="px-8 py-6 flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {svc.analysis.features.map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                        <span className="material-symbols-outlined text-primary text-lg mt-0.5">check_circle</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/5 pt-6">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-extrabold text-white">{svc.analysis.price}</span>
                      <span className="text-white/40 text-sm">{svc.analysis.priceNote}</span>
                    </div>
                    <button onClick={() => navigateTo('brand-setup')} className="w-full h-14 bg-primary text-background-dark rounded-2xl font-extrabold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
                      {svc.analysis.cta}
                    </button>
                  </div>
                </div>
              </div>

              {/* Service 2: Daily Content (Subscription) */}
              <div className="glass rounded-3xl border border-secondary/30 hover:border-secondary/50 transition-all overflow-hidden flex flex-col relative">
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold">
                  {lang === 'ko' ? '인기' : 'Popular'}
                </div>
                <div className="bg-secondary/5 border-b border-white/5 px-8 pt-8 pb-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold mb-4">{svc.daily.badge}</span>
                  <h3 className="text-2xl font-extrabold mb-2">{svc.daily.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{svc.daily.desc}</p>
                </div>
                <div className="px-8 py-6 flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {svc.daily.features.map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                        <span className="material-symbols-outlined text-secondary text-lg mt-0.5">check_circle</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/5 pt-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-extrabold text-white">{svc.daily.price}</span>
                      <span className="text-white/40 text-sm">{svc.daily.priceNote}</span>
                    </div>
                    <p className="text-secondary text-xs font-medium mb-4">{svc.daily.trial}</p>
                    <button onClick={() => navigateTo('subscription')} className="w-full h-14 bg-secondary text-background-dark rounded-2xl font-extrabold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-secondary/20">
                      {svc.daily.cta}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works — Two Tracks */}
          <section className="mt-32 max-w-6xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-16 text-center">{proc.title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

              {/* Track A: Brand Analysis */}
              <div className="glass p-8 rounded-3xl border border-white/10">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-primary text-3xl">brand_awareness</span>
                  <h3 className="text-xl font-extrabold">{proc.analysis.title}</h3>
                </div>
                {[
                  { step: '01', icon: 'cloud_upload', title: proc.analysis.step1, desc: proc.analysis.step1Desc },
                  { step: '02', icon: 'psychology', title: proc.analysis.step2, desc: proc.analysis.step2Desc },
                  { step: '03', icon: 'description', title: proc.analysis.step3, desc: proc.analysis.step3Desc },
                ].map((item, i) => (
                  <div key={item.step} className={`flex gap-4 ${i < 2 ? 'mb-6 pb-6 border-b border-white/5' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl text-primary">{item.icon}</span>
                    </div>
                    <div>
                      <div className="text-primary text-xs font-bold tracking-widest mb-1">STEP {item.step}</div>
                      <h4 className="font-bold mb-1">{item.title}</h4>
                      <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Track B: Daily Content */}
              <div className="glass p-8 rounded-3xl border border-white/10">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-secondary text-3xl">auto_awesome</span>
                  <h3 className="text-xl font-extrabold">{proc.daily.title}</h3>
                </div>
                {[
                  { step: '01', icon: 'tune', title: proc.daily.step1, desc: proc.daily.step1Desc },
                  { step: '02', icon: 'credit_card', title: proc.daily.step2, desc: proc.daily.step2Desc },
                  { step: '03', icon: 'mail', title: proc.daily.step3, desc: proc.daily.step3Desc },
                ].map((item, i) => (
                  <div key={item.step} className={`flex gap-4 ${i < 2 ? 'mb-6 pb-6 border-b border-white/5' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl text-secondary">{item.icon}</span>
                    </div>
                    <div>
                      <div className="text-secondary text-xs font-bold tracking-widest mb-1">STEP {item.step}</div>
                      <h4 className="font-bold mb-1">{item.title}</h4>
                      <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="mt-32 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t.cta.title}</h2>
            <p className="text-white/50 text-lg mb-10 max-w-2xl mx-auto">{t.cta.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigateTo('brand-setup')} className="h-14 px-10 rounded-2xl bg-primary text-background-dark text-lg font-bold hover:scale-105 transition-all">
                {svc.analysis.cta}
              </button>
              <button onClick={() => navigateTo('subscription')} className="h-14 px-10 rounded-2xl bg-secondary text-background-dark text-lg font-bold hover:scale-105 transition-all">
                {svc.daily.cta}
              </button>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 px-6 mt-20">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-xs">
            <span>{t.footer.copyright}</span>
            <div className="flex gap-6">
              <button onClick={() => navigateTo('about')} className="hover:text-white/60 transition-colors">{t.footer.about}</button>
              <button onClick={() => navigateTo('faq')} className="hover:text-white/60 transition-colors">{t.footer.faq}</button>
              <button onClick={() => navigateTo('terms')} className="hover:text-white/60 transition-colors">{t.footer.terms}</button>
              <button onClick={() => navigateTo('privacy')} className="hover:text-white/60 transition-colors">{t.footer.privacy}</button>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Brand Setup Page
  if (page === 'brand-setup') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-28 pb-12 px-6 max-w-2xl mx-auto">
          <div className="glass p-8 rounded-3xl border border-white/10">
            <h2 className="text-2xl font-bold mb-2">{t.brandSetup.title}</h2>
            <p className="text-white/50 mb-8">{t.brandSetup.description}</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo Upload */}
              <div className="relative w-full border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-primary/50 transition-all bg-white/5 p-4 text-center"
                   onClick={() => !loading && document.getElementById('photo-input')?.click()}>
                {photo ? (
                  <img src={photo} className="max-h-48 mx-auto rounded-lg" alt="Logo preview" />
                ) : (
                  <div className="py-10 text-white/40">
                    <span className="material-symbols-outlined text-5xl mb-2">add_a_photo</span>
                    <p>{t.brandSetup.uploadPhoto}</p>
                  </div>
                )}
                <input id="photo-input" type="file" onChange={handlePhotoChange} accept="image/*" hidden />
              </div>

              {/* Brand Name */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.brandSetup.brandName} *</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={t.brandSetup.brandNamePlaceholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                  required
                />
              </div>

              {/* Industry + Target Audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">{t.brandSetup.industry} *</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder={t.brandSetup.industryPlaceholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">{t.brandSetup.targetAudience} *</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder={t.brandSetup.targetAudiencePlaceholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Brand Tone */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.brandSetup.brandTone}</label>
                <div className="grid grid-cols-3 gap-2">
                  {t.brandSetup.tones.map((opt: { value: string; label: string }) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBrandTone(opt.value)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${brandTone === opt.value ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms (multi-select) */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.brandSetup.platforms}</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {t.brandSetup.platformOptions.map((opt: { value: string; label: string }) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => togglePlatform(opt.value)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${selectedPlatforms.includes(opt.value) ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Description */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.brandSetup.brandDescription}</label>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder={t.brandSetup.brandDescriptionPlaceholder}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none resize-none"
                />
              </div>

              <button type="submit" disabled={loading} className="w-full h-14 bg-primary text-background-dark rounded-xl font-extrabold text-lg shadow-lg shadow-primary/20 disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                    {t.brandSetup.analyzing}
                  </span>
                ) : t.brandSetup.submit}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // Brand Report Page
  if (page === 'brand-report') {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-28 pb-12 px-6 max-w-4xl mx-auto">
          <div className="glass p-8 rounded-3xl border border-white/10 mb-8">
            <h2 className="text-3xl font-bold mb-2">{t.result.title}</h2>
            <p className="text-white/50 mb-6">{t.result.description}</p>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-white/80">
              {report}
            </div>

            {/* Marketing Visual */}
            {marketingVisual && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="text-xl font-bold mb-4 text-primary">{t.result.marketingVisual}</h3>
                <img src={marketingVisual} alt="Marketing visual" className="w-full max-w-md rounded-2xl mx-auto" />
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={() => navigateTo('brand-setup')} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors">
              {t.result.tryAgain}
            </button>
            <button onClick={() => window.print()} className="flex-1 h-14 bg-primary text-background-dark rounded-xl font-bold hover:brightness-110 transition-all">
              {t.result.download}
            </button>
          </div>

          {/* Subscribe CTA */}
          <div className="mt-8 glass p-6 rounded-2xl border border-primary/20 text-center">
            <h3 className="text-lg font-bold mb-2">{t.subscription.title}</h3>
            <p className="text-white/50 text-sm mb-4">{t.subscription.description}</p>
            <button onClick={() => navigateTo('subscription')} className="bg-primary text-background-dark px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all">
              {t.subscription.cta}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // MyPage Dashboard
  if (page === 'mypage' && user) {
    return (
      <div className="bg-background-dark text-white min-h-screen">
        <Navbar />
        <main className="pt-28 pb-12 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{t.mypage.title}</h2>

          {/* Account Info */}
          <div className="glass p-6 rounded-2xl border border-white/10 mb-6">
            <h3 className="text-lg font-bold mb-4">{t.mypage.accountInfo}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/50">{t.mypage.email}</span><span>{user.email}</span></div>
              <div className="flex justify-between"><span className="text-white/50">{t.mypage.createdAt}</span><span>{new Date(user.created_at).toLocaleDateString()}</span></div>
            </div>
          </div>

          {/* Daily Content Briefing */}
          <div className="glass p-6 rounded-2xl border border-white/10 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{t.mypage.dailyRecTitle}</h3>
              <button onClick={fetchDailyContent} disabled={dailyRecLoading} className="text-primary text-sm hover:underline disabled:opacity-50">
                {dailyRecLoading ? t.mypage.dailyRecLoading : t.mypage.dailyRecRefresh}
              </button>
            </div>
            {dailyRec ? (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/40 text-xs mb-2">{dailyRec.recommendation_date}</div>
                <div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">{dailyRec.recommendation}</div>
              </div>
            ) : (
              <p className="text-white/40 text-sm">{t.mypage.dailyRecEmpty}</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => navigateTo('brand-setup')} className="glass p-6 rounded-2xl border border-white/10 text-left hover:border-primary/30 transition-colors">
              <span className="material-symbols-outlined text-primary text-2xl mb-2">brand_awareness</span>
              <h4 className="font-bold mb-1">{t.mypage.brandSettings}</h4>
              <p className="text-white/40 text-sm">{t.mypage.brandSettingsEmpty}</p>
            </button>
            <button onClick={() => navigateTo('subscription')} className="glass p-6 rounded-2xl border border-white/10 text-left hover:border-primary/30 transition-colors">
              <span className="material-symbols-outlined text-primary text-2xl mb-2">auto_awesome</span>
              <h4 className="font-bold mb-1">{t.subscription.title}</h4>
              <p className="text-white/40 text-sm">{t.subscription.subtitle}</p>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Fallback for other pages
  return (
    <div className="bg-background-dark text-white min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="glass p-8 rounded-3xl border border-white/10 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">{t.nav.home}</h2>
          <p className="text-white/60 mb-6">{lang === 'ko' ? '홈으로 이동합니다...' : 'Redirecting to home...'}</p>
          <button onClick={() => navigateTo('landing')} className="bg-primary text-background-dark px-8 py-3 rounded-xl font-bold">
            {lang === 'ko' ? '홈으로' : 'Back to Home'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
