import { displayLabel } from '@/lib/display-labels'
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, X, Loader2, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'

import fettigImg from '@/images/fettig.jpg'
import paleImg from '@/images/pale.jpg'
import unreinheitenImg from '@/images/unreinheiten.jpg'
import porenImg from '@/images/poren.jpg'
import roetungenImg from '@/images/rötungen.jpg'
import trockeneImg from '@/images/trocken.jpg'

import porenManImg from '@/images/porenMan.jpg.webp'
import pickelManImg from '@/images/pickelMan.jpg'
import normalManImg from '@/images/normalMan.jpg'
import rasierPickelImg from '@/images/rassierPickel.jpg.webp'
import fettigManImg from '@/images/fettigMan.jpg'


const skinAnalysisStorageKey = 'selfglow-skin-analysis-result'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .skin-analysis * { box-sizing: border-box; }
  .skin-analysis { font-family: 'Outfit', sans-serif; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scan { 0% { top: 0%; } 50% { top: 90%; } 100% { top: 0%; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .sa-fade-up { animation: fadeUp 0.4s ease forwards; }
  .sa-upload-zone { border: 2px dashed #e0c9a8; border-radius: 20px; transition: all 0.2s ease; cursor: pointer; }
  .sa-upload-zone:hover { border-color: #D4A574; background: rgba(212,165,116,0.05); }
  .sa-upload-zone.drag-over { border-color: #D4A574; background: rgba(212,165,116,0.08); }
  .sa-btn { transition: all 0.2s ease; cursor: pointer; font-family: 'Outfit', sans-serif; }
  .sa-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .sa-btn:active { transform: translateY(0); }
  .sa-score-bar { height: 6px; border-radius: 100px; background: #F0DCC8; overflow: hidden; }
  .sa-score-fill { height: 100%; border-radius: 100px; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .sa-product-card { transition: all 0.2s ease; cursor: pointer; }
  .sa-product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,165,116,0.18); }
  .sa-scanning .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #D4A574, transparent); animation: scan 2s ease-in-out infinite; }

  @media (max-width: 380px) {
  .sa-sample-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`

function compressImage(dataUrl: string, maxSize = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize }
        else                { width  = Math.round((width  / height) * maxSize); height = maxSize }
      }
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

export interface AnalysisResult {
  skinType:      string
  dryness:       number
  redness:       number
  blemishes:     number
  sensitivity:   number
  overall:       string
  multipleFaces?: boolean
  tips:          string[]
  products:      { name: string; category: string; reason: string }[]
}

interface SkinAnalysisProps {
  onClose?:             () => void
  onAnalysisComplete?:  (result: AnalysisResult, imageData?: string | null) => void
}

function loadSavedAnalysis(): { imageData: string | null; result: AnalysisResult | null } | null {
  try {
    const saved = sessionStorage.getItem(skinAnalysisStorageKey)
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

function getToken(): string | null {
  try {
    const u = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (u) return JSON.parse(u)?.token || null
    return localStorage.getItem('token') || sessionStorage.getItem('token')
  } catch { return null }
}

const scoreColor = (v: number) => v < 30 ? '#7ab87a' : v < 60 ? '#D4A574' : '#c47a5a'
const scoreLabel = (v: number) => v < 30 ? "Low" : v < 60 ? "Medium" : "High"

const displaySkinType = (s: string) => ({
  Normal: "Normal skin", Oily: "Oily skin", Dry: "Dry skin",
  Sensitive: "Sensitive skin", Combination: "Combination skin",
  Fettig: "Oily skin", Trocken: "Dry skin", Sensibel: "Sensitive skin",
})[s] || s

const categoryEmoji = (c: string) =>
  c === 'Serum' ? '💧' : displayLabel(c) === "Moisturizer" ? '🌿' : c === 'Toner' ? '✨' : displayLabel(c) === "Sunscreen" ? '☀️' : '🧴'

const sampleImagesFemale = [
  { label: "Oily skin",  img: fettigImg,       desc: "Shiny skin, enlarged pores",           skinType: 'Oily',        dryness: 10, redness: 25, blemishes: 65, sensitivity: 20 },
  { label: "Dull skin",   img: paleImg,         desc: "Dull, tired skin that needs refreshing",    skinType: 'Dry',         dryness: 60, redness: 15, blemishes: 10, sensitivity: 50 },
  { label: "Blemishes",  img: unreinheitenImg, desc: "Pimples, blackheads, inflamed areas", skinType: 'Oily',        dryness: 20, redness: 55, blemishes: 80, sensitivity: 40 },
  { label: "Large pores",   img: porenImg,        desc: "Visible pores, oily T-zone",      skinType: 'Combination', dryness: 30, redness: 20, blemishes: 45, sensitivity: 25 },
  { label: "Redness",      img: roetungenImg,    desc: "Red, sensitive skin that stings",          skinType: 'Sensitive',   dryness: 35, redness: 75, blemishes: 15, sensitivity: 80 },
  { label: "Dry skin", img: trockeneImg,     desc: "Tight, flaky skin that needs hydration",  skinType: 'Dry',         dryness: 70, redness: 20, blemishes: 5,  sensitivity: 40 },
]

const sampleImagesMale = [
  { label: "Large pores",   img: porenManImg,     desc: "Visible pores, oily T-zone",      skinType: 'Combination', dryness: 30, redness: 20, blemishes: 45, sensitivity: 25 },
  { label: "Pimples",        img: pickelManImg,    desc: "Pimples, blackheads, inflamed areas", skinType: 'Oily',        dryness: 20, redness: 55, blemishes: 80, sensitivity: 40 },
  { label: "Normal skin",  img: normalManImg,    desc: "Balanced and cared for",                skinType: 'Normal',      dryness: 15, redness: 10, blemishes: 10, sensitivity: 15 },
  { label: "Shaving marks", img: rasierPickelImg, desc: "Redness after shaving, sensitive skin",     skinType: 'Sensitive',   dryness: 35, redness: 70, blemishes: 30, sensitivity: 75 },
  { label: "Oily skin",  img: fettigManImg,    desc: "Shiny skin, enlarged pores",             skinType: 'Oily',        dryness: 10, redness: 25, blemishes: 65, sensitivity: 20 },
  { label: "Large pores",   img: porenManImg,     desc: "Visible pores, combination skin",            skinType: 'Combination', dryness: 25, redness: 15, blemishes: 40, sensitivity: 20 },
]

export default function SkinAnalysis({ onClose, onAnalysisComplete }: SkinAnalysisProps) {
  const { user } = useAuth()
  const isMale = user?.gender === 'male'
  const sampleImages = isMale ? sampleImagesMale : sampleImagesFemale

  const savedAnalysis = onAnalysisComplete ? null : loadSavedAnalysis()

  const [mode,      setMode]      = useState<'choose'|'camera'|'preview'|'loading'|'result'>(savedAnalysis?.result ? 'result' : 'choose')
  const [imageData, setImageData] = useState<string | null>(savedAnalysis?.imageData || null)
  const [result,    setResult]    = useState<AnalysisResult | null>(savedAnalysis?.result || null)
  const [error,     setError]     = useState<string | null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [cameraErr, setCameraErr] = useState<string | null>(null)
  const [saved,     setSaved]     = useState(!!savedAnalysis?.result)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const navigate  = useNavigate()

  const styleInjected = useRef(false)
  if (!styleInjected.current) {
    styleInjected.current = true
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
  }

  const startCamera = useCallback(async () => {
    setCameraErr(null); setMode('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    } catch { setCameraErr("Could not open the camera. Please allow camera access.") }
  }, [])

  const stopCamera = useCallback(() => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }, [])

  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    setImageData(c.toDataURL('image/jpeg', 0.85))
    stopCamera(); setMode('preview')
  }, [stopCamera])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError("Please upload an image."); return }
    const reader = new FileReader()
    reader.onload = e => { setImageData(e.target?.result as string); setMode('preview') }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const analyse = useCallback(async () => {
    if (!imageData) return
    setMode('loading'); setError(null)

    try {
      const compressed = await compressImage(imageData, 800, 0.7)

      const response = await fetch(apiUrl('/api/skin-analysis/analyze'), {        
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageData: compressed, mediaType: 'image/jpeg' }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${response.status}`)
      }

      const parsed: AnalysisResult = await response.json()

      if ((parsed as any).error) {
        setError((parsed as any).error); setMode('preview'); return
      }

      setResult(parsed)
      onAnalysisComplete?.(parsed, imageData)
      if (!onAnalysisComplete) setMode('result')

      sessionStorage.setItem(skinAnalysisStorageKey, JSON.stringify({ imageData, result: parsed }))

      const token = getToken()
      if (token) {
        setSaved(false)
        fetch(apiUrl('/api/skin-analysis/save'), {          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ ...parsed, imageData: compressed }),
        })
          .then(r => r.ok ? setSaved(true) : null)
          .catch(err => console.warn("Could not save analysis:", err))
      }

    } catch (err: any) {
      console.error("Analysis error:", err)
      setError(err.message || "Analysis failed. Please try again.")
      setMode('preview')
    }
  }, [imageData])

  const reset = useCallback(() => {
    stopCamera()
    sessionStorage.removeItem(skinAnalysisStorageKey)
    setMode('choose'); setImageData(null); setResult(null)
    setError(null); setCameraErr(null); setSaved(false)
  }, [stopCamera])

  return (
    <div className="skin-analysis" style={{ background: '#FDFAF6', borderRadius: 20, overflow: 'hidden', maxWidth: 500, width: '100%', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: '#1c1209', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Sparkles size={18} color="#D4A574" style={{ flexShrink: 0 }}/>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Virtual skin analysis</span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4, flexShrink: 0 }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: 'clamp(16px, 4vw, 24px)' }}>

        {/* ── CHOOSE ── */}
        {mode === 'choose' && (
          <div className="sa-fade-up">
            <p style={{ fontSize: 14, color: '#9a7a5a', margin: '0 0 20px', lineHeight: 1.6, fontWeight: 300 }}>
              Take a selfie or upload a photo. AI analyzes your skin type and provides personalized recommendations.
            </p>
            {error && <div style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c47a5a' }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={startCamera} className="sa-btn" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'clamp(13px, 3vw, 16px) clamp(16px, 4vw, 20px)', borderRadius: 14, background: '#1c1209', border: 'none', color: '#fff', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,165,116,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Camera size={18} color="#D4A574" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>Take a selfie</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 300 }}>Open camera and take photo</p>
                </div>
                <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
              </button>

              <div className={`sa-upload-zone ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: '#fff' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Upload size={18} color="#D4A574" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#1c1209' }}>Upload photo</p>
                  <p style={{ fontSize: 12, color: '#9a7a5a', margin: 0, fontWeight: 300 }}>Click or drag an image here</p>
                </div>
                <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <p style={{ fontSize: 11, color: '#c4a882', textAlign: 'center', marginTop: 16, fontWeight: 300 }}>
              Your photo will be saved in your skin profile after analysis.
            </p>

            {/* ── Kein Foto? Hautproblem auswählen ── */}
            <div style={{ marginTop: 24, borderTop: '1px solid #F0DCC8', paddingTop: 20 }}>
              <p style={{ fontSize: 13, color: '#7a5c42', fontWeight: 600, margin: '0 0 4px', textAlign: 'center' }}>
                No photo available?
              </p>
              <p style={{ fontSize: 12, color: '#c4a882', fontWeight: 300, margin: '0 0 14px', textAlign: 'center' }}>
                Choose a suitable image for your analysis
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {sampleImages.map(problem => (
                  <button
                    key={problem.label + problem.img}
                    type="button"
                    className="sa-btn"
                    onClick={() => {
                      setImageData(problem.img)
                      const mockResult: AnalysisResult = {
                        skinType:    problem.skinType,
                        dryness:     problem.dryness,
                        redness:     problem.redness,
                        blemishes:   problem.blemishes,
                        sensitivity: problem.sensitivity,
                        overall:     `Based on your selection: ${problem.desc}.`,
                        tips: [
                          problem.skinType === 'Dry'         ? "Use a rich moisturizer morning and evening." :
                          problem.skinType === 'Oily'        ? "Use oil-free, mattifying products and cleanse twice daily." :
                          problem.skinType === 'Sensitive'   ? "Use fragrance-free, hypoallergenic products without alcohol." :
                          problem.skinType === 'Combination' ? "Use different products for your T-zone and cheeks." :
                                                               "Keep your routine simple and consistent.",
                          "Wear SPF 30+ sunscreen daily.",
                          "Drink enough water and get enough sleep.",
                        ],
                        products: [
                          { name: "Suitable moisturizer", category: 'Feuchtigkeitspflege', reason: `Ideal for ${problem.label}` },
                          { name: "Gentle cleanser",            category: 'Reinigung',           reason: "Gentle and effective" },
                          { name: "SPF 30+ sunscreen",        category: 'Sonnenschutz',         reason: "Daily protection" },
                        ],
                      }
                      setResult(mockResult)
                      setMode('result')
                      onAnalysisComplete?.(mockResult, problem.img)
                    }}
                    style={{ background: '#fff', border: '1.5px solid #F0DCC8', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, textAlign: 'center', padding: 0 }}
                  >
                    <div style={{ width: '100%', height: 'clamp(70px, 18vw, 90px)', overflow: 'hidden' }}>
                      <img src={problem.img} alt={problem.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CAMERA ── */}
        {mode === 'camera' && (
          <div className="sa-fade-up">
            {cameraErr ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#c47a5a', fontSize: 14, marginBottom: 16 }}>{cameraErr}</p>
                <button onClick={reset} className="sa-btn" style={{ padding: '10px 20px', borderRadius: 100, background: '#F5E6D3', border: 'none', color: '#7a5c42', fontSize: 13, fontWeight: 600 }}>Back</button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }} />
                  <div className="sa-scanning" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div className="scan-line" />
                  </div>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <p style={{ fontSize: 12, color: '#9a7a5a', textAlign: 'center', margin: '0 0 16px', fontWeight: 300 }}>Position your face clearly in the frame</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { stopCamera(); setMode('choose') }} className="sa-btn" style={{ flex: 1, padding: 'clamp(10px, 2.5vw, 12px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e0c9a8', color: '#7a5c42', fontSize: 'clamp(13px, 2.5vw, 14px)', fontWeight: 600 }}>Cancel</button>
                  <button onClick={takeSelfie} className="sa-btn" style={{ flex: 2, padding: 'clamp(10px, 2.5vw, 12px)', borderRadius: 100, background: '#D4A574', border: 'none', color: '#fff', fontSize: 'clamp(13px, 2.5vw, 14px)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Camera size={16} />  Capture
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PREVIEW ── */}
        {mode === 'preview' && imageData && (
          <div className="sa-fade-up">
            {error && <div style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c47a5a' }}>{error}</div>}
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, background: '#000' }}>
              <img src={imageData} alt="Preview" style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }} />
            </div>
            <p style={{ fontSize: 13, color: '#9a7a5a', textAlign: 'center', margin: '0 0 16px', fontWeight: 300 }}>Looks good! Ready for analysis?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} className="sa-btn" style={{ padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e0c9a8', color: '#7a5c42', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <RotateCcw size={14} />  Retake
              </button>
              <button onClick={analyse} className="sa-btn" style={{ flex: 1, padding: 'clamp(10px, 2.5vw, 12px)', borderRadius: 100, background: '#D4A574', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Sparkles size={15} />  Analyze now
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {mode === 'loading' && (
          <div className="sa-fade-up" style={{ textAlign: 'center', padding: '32px 0' }}>
            {imageData && (
              <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '3px solid #D4A574' }}>
                <img src={imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <Loader2 size={28} color="#D4A574" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 15, color: '#1c1209', margin: '0 0 6px' }}>Analyzing…</p>
            <p style={{ fontSize: 13, color: '#9a7a5a', margin: 0, fontWeight: 300 }}>AI detects dryness, redness & more</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {mode === 'result' && result && (
          <div className="sa-fade-up">
            {saved && (
              <div style={{ background: '#F0FFF4', border: '1px solid #7ab87a', borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#4a7a4a', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✓ Analysis saved — view it in your profile
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              {imageData && (
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '3px solid #D4A574' }}>
                  <img src={imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4925A', margin: '0 0 4px', fontWeight: 600 }}>Your skin type</p>
                <p style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, color: '#1c1209', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{displaySkinType(result.skinType)}</p>
                <p style={{ fontSize: 13, color: '#9a7a5a', margin: 0, fontWeight: 300, lineHeight: 1.5 }}>{result.overall}</p>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(14px, 3vw, 16px) clamp(14px, 4vw, 18px)', marginBottom: 16, border: '1px solid #F0DCC8' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1209', margin: '0 0 14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Detailed analysis</p>
              {[
                { label: "Dryness",  val: result.dryness },
                { label: "Redness",     val: result.redness },
                { label: "Blemishes", val: result.blemishes },
                { label: "Sensitivity", val: result.sensitivity },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#7a5c42', fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 12, color: scoreColor(s.val), fontWeight: 600 }}>{scoreLabel(s.val)}</span>
                  </div>
                  <div className="sa-score-bar">
                    <div className="sa-score-fill" style={{ width: `${s.val}%`, background: scoreColor(s.val) }} />
                  </div>
                </div>
              ))}
            </div>

            {result.tips?.length > 0 && (
              <div style={{ background: '#FDF6EE', borderRadius: 16, padding: 'clamp(14px, 3vw, 16px) clamp(14px, 4vw, 18px)', marginBottom: 16, border: '1px solid #F0DCC8' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1209', margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Tips for you</p>
                {result.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < result.tips.length - 1 ? 8 : 0 }}>
                    <span style={{ color: '#D4A574', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>✦</span>
                    <p style={{ fontSize: 13, color: '#7a5c42', margin: 0, fontWeight: 300, lineHeight: 1.5 }}>{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {result.products?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1209', margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recommended products</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.products.map((p, i) => (
                    <div key={i} className="sa-product-card" style={{ background: '#fff', border: '1px solid #F0DCC8', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF6EE', border: '1px solid #e8c9a0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                        {categoryEmoji(p.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px', color: '#1c1209' }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: '#D4A574', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{displayLabel(p.category)}</p>
                        <p style={{ fontSize: 12, color: '#9a7a5a', margin: 0, fontWeight: 300, lineHeight: 1.4 }}>{p.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} className="sa-btn" style={{ padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e0c9a8', color: '#7a5c42', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <RotateCcw size={13} />  Retake
              </button>
              <button
                onClick={() => {
                  const skinTypeMap: Record<string, string> = {
                    Normal: 'Normal', Fettig: 'Oily', Trocken: 'Dry',
                    Mischhaut: 'Combination', Sensibel: 'Sensitive',
                    Oily: 'Oily', Dry: 'Dry', Sensitive: 'Sensitive', Combination: 'Combination',
                  }
                  const concernMap: Record<string, string> = { redness: "Redness", blemishes: 'Acne' }
                  const params = new URLSearchParams()
                  params.set('skinType', skinTypeMap[result.skinType] || result.skinType)
                  ;[{ key: 'redness', val: result.redness }, { key: 'blemishes', val: result.blemishes }]
                    .filter(c => c.val >= 50)
                    .forEach(c => params.append('concern', concernMap[c.key]))
                  onAnalysisComplete?.(result, imageData)
                  onClose?.()
                  navigate(`/shop?${params.toString()}`)
                }}
                className="sa-btn"
                style={{ flex: 1, padding: 'clamp(10px, 2.5vs, 12px)', borderRadius: 100, background: '#D4A574', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Matching products <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
