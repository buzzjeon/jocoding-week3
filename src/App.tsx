import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { translations } from './lib/translations'

function App() {
  const navigate = useNavigate(); const location = useLocation();
  const [lang, setLang] = useState('ko'); const [photo, setPhoto] = useState(null);
  const [gender, setGender] = useState('fashion'); const [height, setHeight] = useState('');
  const [weight, setWeight] = useState(''); const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false); const [user, setUser] = useState(null);
  const t = translations[lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!photo) return alert(t.errors.fillAll);
    setLoading(true);
    try {
      const res = await fetch('/api/consult', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo, gender, height, weight, lang })
      });
      const data = await res.json();
      setReport(data.report); navigate('/result');
    } catch { alert(t.errors.connectionFailed); } finally { setLoading(false); }
  };

  const page = location.pathname === '/form' ? 'form' : location.pathname === '/result' ? 'result' : 'landing';

  return (
    <div className="bg-slate-900 text-white min-h-screen p-8">
      <nav className="flex justify-between mb-12">
        <h1 className="text-2xl font-bold" onClick={() => navigate('/')}>GlobalSell AI</h1>
        <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>{lang.toUpperCase()}</button>
      </nav>
      {page === 'landing' && (
        <div className="text-center">
          <h2 className="text-5xl font-bold mb-4">{t.hero.title1} {t.hero.title2}</h2>
          <p className="mb-8">{t.hero.description}</p>
          <button className="bg-blue-600 px-8 py-4 rounded-xl font-bold" onClick={() => navigate('/form')}>{t.hero.cta}</button>
        </div>
      )}
      {page === 'form' && (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
          <input type="file" onChange={e => {
            const reader = new FileReader();
            reader.onload = () => setPhoto(reader.result);
            reader.readAsDataURL(e.target.files[0]);
          }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <input type="text" placeholder={t.form.height} value={height} onChange={e => setHeight(e.target.value)} className="w-full p-2 bg-slate-800 rounded" />
          <input type="number" placeholder={t.form.weight} value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-2 bg-slate-800 rounded" />
          <button type="submit" className="w-full bg-blue-600 py-3 rounded font-bold">{loading ? t.form.analyzing : t.form.submit}</button>
        </form>
      )}
      {page === 'result' && (
        <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">{t.result.title}</h2>
          <div className="whitespace-pre-wrap">{report}</div>
          <button className="mt-8 bg-slate-700 px-4 py-2 rounded" onClick={() => navigate('/form')}>{t.result.tryAgain}</button>
        </div>
      )}
    </div>
  );
}
export default App;
