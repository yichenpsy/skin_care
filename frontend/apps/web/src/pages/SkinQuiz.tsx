import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .quiz-root { font-family: 'Outfit', sans-serif; }
  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .quiz-option { transition: all 0.2s ease; cursor: pointer; border: 2px solid #F0DCC8; }
  .quiz-option:hover { border-color: #D4A574; background: #FDF6EE; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,165,116,0.15); }
  .quiz-option.selected { border-color: #D4A574; background: #FDF6EE; box-shadow: 0 0 0 3px rgba(212,165,116,0.2); }
  .quiz-slide { animation: fadeSlideUp 0.4s ease forwards; }
  .confirm-overlay { animation: fadeIn 0.2s ease forwards; }
`

type QuizFact = { key: string; value: string }
type QuizOption = { label: string; value: string; facts: QuizFact[] }
type QuizQuestion = { id: number; question: string; options: QuizOption[] }

function facts(...items: Array<[string, string]>): QuizFact[] {
  return items.map(([key, value]) => ({ key, value }))
}

// ── 4 Fragen für Frauen ────────────────────────────────────────────────────────
const questionsFemale: QuizQuestion[] = [
  {
    id: 1,
    question: "How does your skin feel when you wake up?",
    options: [
      { label: "Fresh and comfortably balanced",          value: 'Normal',      facts: facts(['skin_state', 'balanced']) },
      { label: "Shiny and oily",                       value: 'Oily',        facts: facts(['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: "Tight and dry",                value: 'Dry',         facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness']) },
      { label: "Oily T-zone, drier cheeks",        value: 'Combination', facts: facts(['skin_state', 'oily_t_zone'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 2,
    question: "How does your skin react to new skincare products?",
    options: [
      { label: "Hardly reacts — tolerates almost everything",      value: 'Normal',    facts: facts(['sensitivity', 'tolerant']) },
      { label: "Quickly becomes oilier or shinier", value: 'Oily',      facts: facts(['product_reaction', 'too_greasy'], ['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: "Redness, burning, or itching",              value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness'], ['product_reaction', 'burning']) },
      { label: "Feels tight, flaky, or drawn",   value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['skin_state', 'flakiness'], ['product_reaction', 'drying']) },
    ],
  },
  {
    id: 3,
    question: "How often do you notice enlarged pores?",
    options: [
      { label: "Rarely or never",                             value: 'Normal',      facts: facts(['skin_state', 'refined_pores']) },
      { label: "Often, especially in the center of my face",       value: 'Oily',        facts: facts(['concern', 'pores'], ['skin_state', 'oily']) },
      { label: "Only in the T-zone",                          value: 'Combination', facts: facts(['concern', 'pores'], ['skin_state', 'oily_t_zone']) },
      { label: "Barely visible, but skin looks dull",        value: 'Dry',         facts: facts(['skin_state', 'matte'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 4,
    question: "How does your skin feel after cleansing?",
    options: [
      { label: "Comfortably clean and fresh",                 value: 'Normal',    facts: facts(['skin_state', 'balanced']) },
      { label: "Still a little oily",                    value: 'Oily',      facts: facts(['skin_state', 'oily']) },
      { label: "Very dry and tight",              value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['product_reaction', 'drying']) },
      { label: "Sensitive and slightly irritated",             value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness']) },
    ],
  },
]

// ── 4 Fragen für Männer ────────────────────────────────────────────────────────
const questionsMale: QuizQuestion[] = [
  {
    id: 1,
    question: "How does your skin feel when you wake up?",
    options: [
      { label: "Fresh and normal — no issues",           value: 'Normal',      facts: facts(['skin_state', 'balanced']) },
      { label: "Oily and shiny",                        value: 'Oily',        facts: facts(['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: "Dry and tight",                         value: 'Dry',         facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness']) },
      { label: "Oily forehead, drier cheeks",          value: 'Combination', facts: facts(['skin_state', 'oily_t_zone'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 2,
    question: "How does your skin react after shaving?",
    options: [
      { label: "No issues, feels normal",         value: 'Normal',    facts: facts(['sensitivity', 'tolerant']) },
      { label: "Quickly becomes oily again",                 value: 'Oily',      facts: facts(['product_reaction', 'too_greasy'], ['skin_state', 'oily']) },
      { label: "Burns, turns red, or itches",              value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness'], ['product_reaction', 'burning']) },
      { label: "Very tight and rough",         value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['skin_state', 'rough_texture'], ['product_reaction', 'drying']) },
    ],
  },
  {
    id: 3,
    question: "How often do you get blemishes or pimples?",
    options: [
      { label: "Rarely or never",                             value: 'Normal',      facts: facts(['skin_state', 'clear_skin']) },
      { label: "Often, especially in the T-zone",            value: 'Oily',        facts: facts(['concern', 'blemishes'], ['skin_state', 'oily_t_zone']) },
      { label: "Sometimes, only on my forehead",           value: 'Combination', facts: facts(['concern', 'blemishes'], ['skin_state', 'oily_t_zone']) },
      { label: "Rarely, but my skin is often dry",            value: 'Dry',         facts: facts(['skin_state', 'clear_skin'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 4,
    question: "What happens if you go without moisturizer for a while?",
    options: [
      { label: "Nothing in particular",               value: 'Normal',    facts: facts(['skin_state', 'balanced']) },
      { label: "Skin becomes oilier",                    value: 'Oily',      facts: facts(['skin_state', 'oily']) },
      { label: "Skin feels tight and flaky",               value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['skin_state', 'flakiness']) },
      { label: "Skin becomes irritated and sensitive",          value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness']) },
    ],
  },
]

// ── 4 Fragen für Divers ────────────────────────────────────────────────────────
const questionsDiverse: QuizQuestion[] = [
  {
    id: 1,
    question: "How does your skin feel in the morning?",
    options: [
      { label: "Balanced and comfortable",                  value: 'Normal',      facts: facts(['skin_state', 'balanced']) },
      { label: "Oily and shiny",                        value: 'Oily',        facts: facts(['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: "Dry, tight, or drawn",                 value: 'Dry',         facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness']) },
      { label: "Varies by area",                   value: 'Combination', facts: facts(['skin_state', 'oily_t_zone'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 2,
    question: "How does your skin react to new products?",
    options: [
      { label: "Tolerates almost everything without issues",          value: 'Normal',    facts: facts(['sensitivity', 'tolerant']) },
      { label: "Quickly becomes oilier or shinier",      value: 'Oily',      facts: facts(['product_reaction', 'too_greasy'], ['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: "Redness, burning, or irritation",             value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness'], ['product_reaction', 'burning']) },
      { label: "Feels tight or becomes drier",            value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['product_reaction', 'drying']) },
    ],
  },
  {
    id: 3,
    question: "How do you feel after washing your face?",
    options: [
      { label: "Clean and comfortably fresh",                 value: 'Normal',    facts: facts(['skin_state', 'balanced']) },
      { label: "Still slightly oily",                         value: 'Oily',      facts: facts(['skin_state', 'oily']) },
      { label: "Very dry and tight",                  value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['product_reaction', 'drying']) },
      { label: "Sensitive or slightly irritated",            value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness']) },
    ],
  },
  {
    id: 4,
    question: "How often do you notice enlarged pores?",
    options: [
      { label: "Rarely or never",                             value: 'Normal',      facts: facts(['skin_state', 'refined_pores']) },
      { label: "Often, especially on my forehead and nose",           value: 'Oily',        facts: facts(['concern', 'pores'], ['skin_state', 'oily_t_zone']) },
      { label: "Only in certain areas",                value: 'Combination', facts: facts(['concern', 'pores'], ['skin_state', 'oily_t_zone']) },
      { label: "Rarely — but my skin looks dull",                value: 'Dry',         facts: facts(['skin_state', 'matte'], ['skin_state', 'dryness']) },
    ],
  },
]

const skinTypeInfo: Record<string, { label: string; desc: string; descMale: string; shopFilter: string }> = {
  Normal:      {
    label: "Normal skin",
    desc: "Your skin is balanced, neither too oily nor too dry. You need lightweight skincare to maintain its natural balance.",
    descMale: "Your skin is balanced. A simple routine with a light moisturizer and sunscreen helps maintain it.",
    shopFilter: 'Normal',
  },
  Oily:        {
    label: "Oily skin",
    desc: "Your skin produces a lot of oil. Lightweight products that clear pores help control shine without drying your skin.",
    descMale: "Your skin produces a lot of oil, especially after shaving. Oil-free, mattifying products and a good cleanser help control shine.",
    shopFilter: 'Oily',
  },
  Dry:         {
    label: "Dry skin",
    desc: "Your skin needs intensive hydration. Rich creams and hyaluronic acid serums are ideal.",
    descMale: "Your skin loses moisture quickly, especially after shaving. Rich moisturizers and aftershave balm are ideal.",
    shopFilter: 'Dry',
  },
  Sensitive:   {
    label: "Sensitive skin",
    desc: "Your skin is sensitive. Gentle, fragrance-free products with soothing ingredients such as aloe and ceramides are ideal.",
    descMale: "Your skin is sensitive, especially to shaving and new products. Gentle, fragrance-free formulas and soothing aftershave products can help.",
    shopFilter: 'Sensitive',
  },
  Combination: {
    label: "Combination skin",
    desc: "You have combination skin: an oily T-zone and drier cheeks. You need products that balance both.",
    descMale: "Your forehead and nose are oily, while your cheeks are drier. Balancing gel and lightweight moisturizers help care for both areas.",
    shopFilter: 'Combination',
  },
}

function getIntroConfig(gender: string | null) {
  if (gender === 'male')    return { emoji: '🧖‍♂️', title: "Your skin type as a man",   sub: "4 questions — your ideal skincare plan" }
  if (gender === 'female')  return { emoji: '🧖‍♀️', title: "Your skin type as a woman",   sub: "4 questions — your ideal skincare routine" }
  if (gender === 'diverse') return { emoji: '🧖',    title: "Discover your skin type", sub: "4 questions — your personalized skincare" }
  return                           { emoji: '🧖‍♀️', title: "Quick skin quiz",     sub: "4 quick questions — in just 30 seconds" }
}

function getQuestions(gender: string | null) {
  if (gender === 'male')    return questionsMale
  if (gender === 'diverse') return questionsDiverse
  return questionsFemale
}

function getMostFrequent(map: Record<number, string>) {
  const values = Object.values(map)
  const count: Record<string, number> = {}
  values.forEach(v => { count[v] = (count[v] || 0) + 1 })
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]
}

export default function SkinQuiz() {
  const navigate             = useNavigate()
  const { user, updateUser } = useAuth()
  const styleRef             = useRef<HTMLStyleElement | null>(null)
  const gender               = user?.gender ?? null

  const [step,        setStep]        = useState(0)
  const [answers,     setAnswers]     = useState<Record<number, string>>({})
  const [result,      setResult]      = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const questions   = getQuestions(gender)
  const introConfig = getIntroConfig(gender)
  const totalSteps  = questions.length

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    styleRef.current = el
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current) }
  }, [])

  const currentQ = questions[step - 1]
  const selected = answers[step] ?? null

  function handleSelect(value: string) { setAnswers(prev => ({ ...prev, [step]: value })) }

  async function handleNext() {
    if (!selected) return
    if (step === totalSteps) {
      const skin = getMostFrequent(answers)
      setResult(skin)
      setStep(totalSteps + 1)
      if (user?.token) {
        setSaving(true)
        try {
          const quizAnswers = questions.map(question => {
            const value = answers[question.id]
            const option = question.options.find(item => item.value === value)
            return {
              questionId: question.id,
              question: question.question,
              answer: option?.label || '',
              value,
              facts: option?.facts || [],
            }
          }).filter(item => item.value)
          const res = await fetch(apiUrl('/api/auth/skin-type'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ skinType: skin, source: 'quiz', quizAnswers }),
          })
          const data = await res.json()
          if (data.user) updateUser({ ...user, ...data.user, token: user.token })
        } catch (err) { console.warn("Could not save skin type:", err) }
        finally { setSaving(false) }
      }
    } else {
      setStep(step + 1)
    }
  }

  function handleBack() { if (step === 1) setStep(0); else setStep(step - 1) }
  function resetQuiz()  { setStep(0); setAnswers({}); setResult(null) }
  function openConfirm() { setShowConfirm(true) }
  function confirmExit() { setShowConfirm(false); navigate('/') }

  const skinResult = result ? skinTypeInfo[result] : null
  const resultDesc = skinResult ? (gender === 'male' ? skinResult.descMale : skinResult.desc) : ''

  return (
    <div className="quiz-root" style={{ minHeight: '100vh', background: '#FDFAF6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px, 10vw, 80px) clamp(16px, 4vw, 20px)', position: 'relative' }}>

      {showConfirm && (
        <div className="confirm-overlay" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 'clamp(24px, 6vw, 36px) clamp(20px, 5vw, 32px)', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', fontFamily: "'Outfit', sans-serif" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1c1209', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Quit quiz?</h3>
            <p style={{ fontSize: 14, color: '#9a7a5a', margin: '0 0 28px', lineHeight: 1.6, fontWeight: 300 }}>Your progress will be lost. Are you sure you want to quit the quiz?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, border: '1.5px solid #e0c9a8', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#7a5c42', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                No, continue
              </button>
              <button onClick={confirmExit}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, background: '#D4A574', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#c4925a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#D4A574')}>
                Yes, quit
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 560 }}>

        {step < totalSteps + 1 && (
          <button onClick={openConfirm}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#b8967a', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif", padding: '0 0 24px 0' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D4A574')}
            onMouseLeave={e => (e.currentTarget.style.color = '#b8967a')}>
            <ArrowLeft size={15} />  Leave
          </button>
        )}

        {/* ── INTRO ── */}
        {step === 0 && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(40px, 10vw, 52px)', marginBottom: 16 }}>{introConfig.emoji}</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, color: '#1c1209', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              {introConfig.title}
            </h1>
            <p style={{ fontSize: 15, color: '#9a7a5a', lineHeight: 1.7, margin: '0 0 8px', fontWeight: 300 }}>{introConfig.sub}</p>
            <p style={{ fontSize: 14, color: '#c4a882', margin: '0 0 40px', fontWeight: 300 }}>
              We'll identify your skin type and recommend suitable products.
            </p>
            <button onClick={() => setStep(1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#D4A574', color: '#fff', padding: 'clamp(13px, 3vw, 15px) clamp(24px, 6vw, 36px)', borderRadius: 100, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
              Start quiz <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {step >= 1 && step <= totalSteps && currentQ && (
          <div className="quiz-slide" key={step}>
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4925A', margin: '0 0 10px', fontWeight: 600 }}>
                Question {step} von {totalSteps}
              </p>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#1c1209', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {currentQ.question}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {currentQ.options.map((opt) => (
                <button key={opt.value} onClick={() => handleSelect(opt.value)}
                  className={`quiz-option ${selected === opt.value ? 'selected' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(14px, 3vw, 16px) clamp(16px, 4vw, 20px)', borderRadius: 14, background: '#fff', textAlign: 'left', fontFamily: "'Outfit', sans-serif", fontSize: '(14px, 2.5vw, 15px)', fontWeight: 500, color: '#1c1209' }}>
                  <span>{opt.label}</span>
                  {selected === opt.value && <CheckCircle size={18} color="#D4A574" style={{ flexShrink: 0, marginLeft: 12 }}/>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleBack}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'clamp(12px, 3vw, 13px) clamp(14px, 3vw, 20px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
                <ArrowLeft size={15} /> <span className="hide-on-tiny">Back</span>
              </button>
              <button onClick={handleNext} disabled={!selected}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 'clamp(12px, 3vw, 13px) clamp(16px, 4vw, 24px)', borderRadius: 100, background: selected ? '#D4A574' : '#e8c9a0', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: selected ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", transition: 'background 0.2s' }}>
                {step === totalSteps ? "Show result" : "Next"} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === totalSteps + 1 && skinResult && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 8, fontWeight: 600 }}>Your skin type</p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, color: '#1c1209', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              {skinResult.label}
            </h2>
            <p style={{ fontSize: 15, color: '#7a5c42', lineHeight: 1.75, margin: '0 auto 16px', maxWidth: 420, fontWeight: 300 }}>
              {resultDesc}
            </p>
            {user && saving && <p style={{ fontSize: 13, color: '#b8967a', marginBottom: 32, fontWeight: 500 }}>⏳ Saving…</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => navigate(`/shop?skinType=${encodeURIComponent(skinResult.shopFilter)}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 'clamp(13px, 3vw, 15px) clamp(20px, 5vw, 28px)', borderRadius: 100, background: '#D4A574', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Discover matching products <ArrowRight size={15} />
              </button>
              <button onClick={() => navigate('/')}
                style={{ padding: 'clamp(12px, 3vw, 13px) clamp(20px, 5vw, 28px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Back to home
              </button>
              <button onClick={resetQuiz}
                style={{ fontSize: 13, color: '#c4a882', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", textDecoration: 'underline' }}>
                Retake quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
