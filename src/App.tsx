import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { translations } from './lib/translations'
import type { User } from '@supabase/supabase-js'

type Page = 'landing' | 'form' | 'result' | 'payment-success' | 'terms' | 'privacy' | 'refund' | 'login' | 'signup' | 'mypage' | 'forgot-password' | 'reset-password' | 'subscription' | 'subscription-success' | 'partnership' | 'about' | 'faq'
type Language = 'en' | 'ko'

const getInitialLang = (): Language => {
  if (typeof window === 'undefined') return 'ko'
  const stored = window.localStorage.getItem('sellboost-lang')
  if (stored === 'en' || stored === 'ko') return stored
  const nav = window.navigator.language?.toLowerCase() || ''
  return nav.startsWith('ko') ? 'ko' : 'en'
}

const pageRoutes: Record<Page, string> = {
  landing: '/',
  form: '/form',
  result: '/result',
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
  const [photo, setPhoto] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [tone, setTone] = useState('premium')
  const [platform, setPlatform] = useState('all')
  const [keywords, setKeywords] = useState('')
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Mypage / Dashboard states
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
      window.localStorage.setItem('sellboost-lang', lang)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName || !category || !keyFeatures) {
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
          productName,
          brandName,
          category,
          price,
          targetAudience,
          keyFeatures,
          tone,
          platform,
          keywords,
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

  // --- UI Components ---
  const Navbar = () => (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
        <h1 onClick={() => navigateTo('landing')} className="text-white text-xl font-extrabold tracking-tight cursor-pointer">
          SellBoost <span className="text-primary text-2xl">AI</span>
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

  // --- Render Pages ---
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
              <button onClick={() => navigateTo('form')} className="h-14 px-10 rounded-2xl bg-primary text-background-dark text-lg font-bold hover:scale-105 transition-all">
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
          <div className="glass p-8 rounded-3xl border border-white/10">
            <h2 className="text-2xl font-bold mb-2">{t.form.title}</h2>
            <p className="text-white/50 mb-8">{t.form.description}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div className="relative w-full border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-primary/50 transition-all bg-white/5 p-4 text-center"
                   onClick={() => !loading && document.getElementById('photo-input')?.click()}>
                {photo ? (
                  <img src={photo} className="max-h-64 mx-auto rounded-lg" alt="Preview" />
                ) : (
                  <div className="py-12 text-white/40">
                    <span className="material-symbols-outlined text-5xl mb-2">add_a_photo</span>
                    <p>{t.form.uploadPhoto}</p>
                  </div>
                )}
                <input id="photo-input" type="file" onChange={handlePhotoChange} accept="image/*" hidden />
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">{t.form.productName}</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. UltraGrip Phone Stand"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">{t.form.brandName}</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. BoostLab"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">{t.form.category}</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Mobile Accessories"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">{t.form.price}</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. $29.99"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.form.targetAudience}</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Commuters, students, remote workers"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.form.keyFeatures}</label>
                <textarea
                  value={keyFeatures}
                  onChange={(e) => setKeyFeatures(e.target.value)}
                  placeholder={t.form.keyFeaturesPlaceholder}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.form.tone}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {t.form.tones.map((opt: { value: string; label: string }) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTone(opt.value)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${tone === opt.value ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.form.platforms}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {t.form.platformOptions.map((opt: { value: string; label: string }) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPlatform(opt.value)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${platform === opt.value ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/50 border border-white/10'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">{t.form.keywords}</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. ergonomic, portable, anti-slip"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                />
              </div>

              <button type="submit" disabled={loading} className="w-full h-14 bg-primary text-background-dark rounded-xl font-extrabold text-lg shadow-lg shadow-primary/20">
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
          <div className="glass p-8 rounded-3xl border border-white/10 mb-8">
            <h2 className="text-3xl font-bold mb-6">{t.result.title}</h2>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-white/80">
              {report}
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigateTo('form')} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-xl font-bold">{t.result.tryAgain}</button>
            <button onClick={() => window.print()} className="flex-1 h-14 bg-primary text-background-dark rounded-xl font-bold">{t.result.download}</button>
          </div>
        </main>
      </div>
    )
  }

  // Fallback for Login/SignUp/Other simple pages
  return (
    <div className="bg-background-dark text-white min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="glass p-8 rounded-3xl border border-white/10 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">{t.nav.home}</h2>
          <p className="text-white/60 mb-6">Redirecting to home...</p>
          <button onClick={() => navigateTo('landing')} className="bg-primary text-background-dark px-8 py-3 rounded-xl font-bold">Back to Home</button>
        </div>
      </main>
    </div>
  )
}

export default App
