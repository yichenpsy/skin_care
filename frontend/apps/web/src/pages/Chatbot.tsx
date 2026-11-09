import { displayLabel } from '@/lib/display-labels'
import { ProductImage } from '@/components/ProductImage'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bot, Camera, MessageCircle, Plus, Send, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { apiUrl } from '@/lib/api'
import { cn } from '@workspace/ui/lib/utils'
import SkinAnalysis from '@/pages/SkinAnalysis'
import { useChat, initialMessages, type Message, type ChatProduct } from '@/context/ChatContext'
import { useAuth } from '@/context/AuthContext'

type ChatResponseData = {
  answer: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
}

type WeatherData = {
  summary?: string
  temp?: number
  humidity?: number
  weatherMain?: string
  season?: string
  promptContext?: string
}

// ── NEU: Typen für personalisierte Starter-Fragen ──────────────────────────
type ProfileFact = { key: string; value: string }
type ProfileCartItem = { id: number; name: string }
type ProfileContext = {
  skinType?: string | null
  gender?: string | null
  facts?: ProfileFact[]
  cart?: ProfileCartItem[]
  wishlist?: ProfileCartItem[]
}
type StarterQuestion = {
  label: string
  message: string
  contextProductIds?: number[]
}

function getWeatherEmoji(weatherMain?: string, temp?: number): string {
  if (!weatherMain) return '🌡️'
  const w = weatherMain.toLowerCase()
  if (w === 'clear') return temp && temp >= 25 ? '☀️' : '🌤️'
  if (w === 'clouds') return '☁️'
  if (w === 'rain' || w === 'drizzle') return '🌧️'
  if (w === 'thunderstorm') return '⛈️'
  if (w === 'snow') return '❄️'
  if (w === 'mist' || w === 'fog' || w === 'haze') return '🌫️'
  return '🌡️'
}


function getWeatherRecommendationPrompt(weather: WeatherData): string {
  const emoji = getWeatherEmoji(weather.weatherMain, weather.temp)
  return `${emoji} It is ${weather.temp !== undefined ? weather.temp + '°C' : 'currently'} and ${weather.weatherMain?.toLowerCase() || "cloudy"} with ${weather.humidity ?? '?'}% humidity. Which skincare products would you recommend for this weather?`
}

const skinTypeLabels: Record<string, string> = {
  Normal: "normal skin",
  Oily: "oily skin",
  Dry: "dry skin",
  Sensitive: "sensitive skin",
  Combination: "Combination skin",
}

const profileFactLabels: Record<string, string> = {
  acne: "Blemishes",
  blemishes: "Blemishes",
  redness: "Redness",
  pores: "large pores",
  dark_spots: "Dark spots",
  balanced: "balanced skin",
  oily: "oily skin",
  oily_t_zone: "an oily T-zone",
  shine: "Shine",
  dryness: "Dryness",
  dehydration: "dehydrated skin",
  tightness: "tightness",
  flakiness: "flaky skin",
  rough_texture: "rough skin texture",
  refined_pores: "refined pores",
  clear_skin: "few blemishes",
  matte: "dull skin",
  combination_zones: "combination skin areas",
  sensitive: "sensitive skin",
  tolerant: "resilient skin",
  fragrance: "Fragrance",
  alcohol: "Alcohol",
  fragrance_free: "fragrance-free skincare",
  alcohol_free: "alcohol-free skincare",
  vegan: "vegan products",
  non_comedogenic: "non-comedogenic products",
  oil_free: "oil-free products",
  cruelty_free: "cruelty-free products",
  natural_ingredients: "natural ingredients",
  light_texture: "lightweight textures",
  rich_texture: "rich textures",
}

function formatProfileFact(value: string) {
  return profileFactLabels[value] || value.replace(/_/g, ' ')
}

function compactProductName(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 22 ? `${text.slice(0, 22)}...` : text
}

function getFactValues(profileContext: ProfileContext | null, keys: string[]) {
  return (profileContext?.facts || [])
    .filter((fact) => keys.includes(fact.key))
    .map((fact) => fact.value)
    .filter(Boolean)
}

function buildPersonalizedStarterQuestions(
  userSkinType?: string | null,
  weather?: WeatherData | null,
  profileContext?: ProfileContext | null
): StarterQuestion[] {
  const profileSkinType = profileContext?.skinType || userSkinType
  const questions: StarterQuestion[] = []
  const concerns = getFactValues(profileContext || null, ['concern', 'skin_state'])
  const preferences = getFactValues(profileContext || null, ['preference'])
  const avoidances = getFactValues(profileContext || null, ['ingredient_avoidance', 'allergy'])
  const cartProduct = profileContext?.cart?.[0]
  const wishlistProduct = profileContext?.wishlist?.[0]
  const effectiveSkinLabel = profileSkinType ? skinTypeLabels[profileSkinType] || `${profileSkinType} Skin` : null

  if (cartProduct && effectiveSkinLabel) {
    questions.push({
      label: `Does ${compactProductName(cartProduct.name)} suit me?`,
      message: `Does ${cartProduct.name} suit ${effectiveSkinLabel}? Please check ingredients, skin type, and how to use it.`,
      contextProductIds: [cartProduct.id],
    })
  } else if (cartProduct) {
    questions.push({
      label: `${compactProductName(cartProduct.name)}: how to use`,
      message: `How can I use ${cartProduct.name} effectively in my routine?`,
      contextProductIds: [cartProduct.id],
    })
  } else if (effectiveSkinLabel) {
    questions.push({
      label: `Products for ${effectiveSkinLabel}`,
      message: `Which products suit ${effectiveSkinLabel}?`,
    })
  }

  if (concerns.length > 0) {
    questions.push({
      label: `Routine for ${formatProfileFact(concerns[0])}`,
      message: `What routine helps with ${formatProfileFact(concerns[0])}?`,
    })
  } else if (avoidances.length > 0) {
    questions.push({
      label: `Products without ${formatProfileFact(avoidances[0])}`,
      message: `Which products suit me if I want to avoid ${formatProfileFact(avoidances[0])} ?`,
    })
  } else if (preferences.length > 0) {
    questions.push({
      label: `${formatProfileFact(preferences[0])}`,
      message: `Which products suit my preference for ${formatProfileFact(preferences[0])}?`,
    })
  } else if (wishlistProduct && effectiveSkinLabel) {
    questions.push({
      label: `Does ${compactProductName(wishlistProduct.name)} suit me?`,
      message: `Does ${wishlistProduct.name} suit ${effectiveSkinLabel}? Please check ingredients, skin type, and how to use it.`,
      contextProductIds: [wishlistProduct.id],
    })
  } else if (effectiveSkinLabel) {
    if (profileSkinType === 'Oily') {
      questions.push({ label: "Lightweight routine", message: "What simple routine helps with oily skin and blemishes?" })
    } else if (profileSkinType === 'Dry') {
      questions.push({ label: "More hydration", message: "What hydrating routine suits dry skin?" })
    } else if (profileSkinType === 'Sensitive') {
      questions.push({ label: "Fragrance-free skincare", message: "Which fragrance-free products suit sensitive skin?" })
    } else if (profileSkinType === 'Combination') {
      questions.push({ label: "Routine for combination skin", message: "How do I combine skincare for oily and dry areas?" })
    } else {
      questions.push({ label: "Support the skin barrier", message: "How can I support my skin barrier with a simple routine?" })
    }
  }
  if (questions.length === 0) {
    questions.push({ label: "Matching products", message: "Which products suit my current skin profile?" })
    questions.push({ label: "Simple routine", message: "Help me build a simple skincare routine." })
  }

  if (weather?.temp !== undefined || weather?.humidity !== undefined || weather?.weatherMain) {
    questions.push({ label: "Weather tips", message: getWeatherRecommendationPrompt(weather) })
  } else {
    questions.push({ label: "Morning or evening?", message: "Which products should I combine in the morning and evening?" })
  }

  return questions.slice(0, 3)
}

const medicalDisclaimer = "note: this is not a medical diagnosis."
const legacyMedicalDisclaimer = 'Das ist keine medizinische Diagnose, sondern eine Produktempfehlung auf Basis deiner Anfrage.'

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function renderMessageContent(message: Message) {
  if (message.role !== 'assistant') return renderStructuredText(message.content)
  const hasNew = message.content.toLowerCase().includes(medicalDisclaimer)
  const hasLegacy = message.content.includes(legacyMedicalDisclaimer)
  if (!hasNew && !hasLegacy) return renderStructuredText(message.content)
  const main = message.content.replace(new RegExp(medicalDisclaimer, 'i'), '').replace(legacyMedicalDisclaimer, '').trim()
  return (
    <>
      {main && renderStructuredText(main)}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{medicalDisclaimer}</p>
    </>
  )
}

function renderInlineText(text: string) {
  const match = text.match(/^\*\*(.+)\*\*$/)
  if (match) return <span className="font-semibold">{match[1]}</span>
  return text
}

function renderStructuredText(content: string) {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) return content
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line === '---') return <hr key={i} className="border-border" />
        if (line.startsWith('- ')) return (
          <div key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A574]" />
            <span>{renderInlineText(line.slice(2))}</span>
          </div>
        )
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="pt-1 font-semibold">{renderInlineText(line)}</p>
        return <p key={i}>{renderInlineText(line)}</p>
      })}
    </div>
  )
}

function parseSseEvent(eventText: string) {
  const eventType = eventText.split('\n').find((l) => l.startsWith('event:'))?.slice(6).trim()
  const dataText = eventText.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n')
  if (!eventType || !dataText) return null
  try {
    return { event: eventType, data: JSON.parse(dataText) as { text?: string } & ChatResponseData & { message?: string } }
  } catch { return null }
}

function getLatestRecommendedProductIds(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.products?.length) return m.products.slice(0, 3).map((p) => p.id)
  }
  return []
}

export default function Chatbot() {
  const {
    chatState, setChatState,
    activeConversation,
    input, setInput,
    startNewConversation: startNewConversationCtx,
    selectConversation: selectConversationCtx,
    deleteConversation: deleteConversationCtx,
    applyMessages,
    saveConversationToDb,
    isLoadingHistory,
    weather,
    fetchWeather,
  } = useChat()
  const { token, user, updateUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
const handledHautwissenStartRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [explainingMessageId, setExplainingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [isGeneratingGlow] = useState(false)
  const [glowLoadingForMsg, setGlowLoadingForMsg] = useState<string | null>(null)
  const [glowSources, setGlowSources] = useState<Record<string, string>>({})
  const [weatherAnimation, setWeatherAnimation] = useState<string | null>(null)
  const [profileContext, setProfileContext] = useState<ProfileContext | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const weatherRef = useRef<object | null>(weather)
  useEffect(() => { weatherRef.current = weather }, [weather])

  const messages = activeConversation?.messages ?? initialMessages
  const personalizedStarterQuestions = buildPersonalizedStarterQuestions(user?.skinType, weather as WeatherData | null, profileContext)

  async function refreshProfileContext() {
    if (!token) {
      setProfileContext(null)
      return
    }

    try {
      const response = await fetch(apiUrl('/api/auth/profile-context'), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        setProfileContext(null)
        return
      }

      const data = await response.json()
      setProfileContext(data)

      if (user && (data.skinType !== user.skinType || data.gender !== user.gender)) {
        updateUser({
          ...user,
          skinType: data.skinType ?? null,
          gender: data.gender ?? null,
        })
      }
    } catch (err) {
      console.error(err)
      setProfileContext(null)
    }
  }

  useEffect(() => {
    refreshProfileContext()
  }, [token])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, isLoading, explainingMessageId, isGeneratingGlow])

  function updateUiOnly(conversationId: string, updater: (msgs: Message[]) => Message[]) {
    setChatState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id !== conversationId ? c : { ...c, messages: updater(c.messages) }
      ),
    }))
  }

  function startNewConversation() {
    if (isLoading) return
    startNewConversationCtx()
    setError(null)
  }

  function selectConversation(id: string) {
    if (isLoading) return
    selectConversationCtx(id)
    setError(null)
  }

  function deleteConversation(id: string) {
    if (isLoading) return
    deleteConversationCtx(id)
    setError(null)
  }

  async function generateGlowImage(imageData: string, conversationId: string, triggerMsgId: string) {
    setGlowLoadingForMsg(triggerMsgId)
    try {
      const res = await fetch(apiUrl('/api/skin-analysis/glow'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.imageData) return

      const glowMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "✨ This is what your skin could look like with a consistent skincare routine — clear, radiant, and healthy. You can do it! 💪",
        imageUrl: data.imageData,
      }
      const updated = applyMessages(conversationId, (msgs) => [...msgs, glowMsg])
      if (updated) saveConversationToDb(updated)
    } catch {
      // optional
    } finally {
      setGlowLoadingForMsg(null)
    }
  }

  async function sendMessage(messageText: string, contextProductIdsOverride?: number[]) {
    const trimmed = messageText.trim()
    if (!trimmed || isLoading) return

    const conversationId = chatState.activeConversationId
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = { id: assistantMessageId, role: 'assistant', content: '' }

    const chatHistory = [...messages, userMessage].slice(-4).map((m) => ({ role: m.role, content: m.content }))
    const contextProductIds = contextProductIdsOverride ?? getLatestRecommendedProductIds(messages)

    updateUiOnly(conversationId, (msgs) => [...msgs, userMessage, assistantMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(apiUrl('/api/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: chatHistory, contextProductIds, weather }),
      })
      if (!response.ok) throw new Error("The AI advisor could not respond right now.")
      if (!response.body) throw new Error("Streaming is not supported.")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalAnswer = ''
      let finalProducts: ChatProduct[] = []
      let finalCanExplain = false

      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventText of events) {
          const parsed = parseSseEvent(eventText)
          if (!parsed) continue

          if (parsed.event === 'delta' && parsed.data.text) {
            updateUiOnly(conversationId, (msgs) =>
              msgs.map((m) => m.id === assistantMessageId ? { ...m, content: m.content + parsed.data.text! } : m)
            )
          }

          if (parsed.event === 'done') {
            finalAnswer = parsed.data.answer ?? ''
            finalProducts = parsed.data.products ?? []
            finalCanExplain = parsed.data.canExplainProducts ?? false
          }

          if (parsed.event === 'error') throw new Error(parsed.data.message ?? "Streaming failed.")
        }
        if (done) break
      }

      const updated = applyMessages(conversationId, (msgs) =>
        msgs.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: finalAnswer || m.content, products: finalProducts, canExplainProducts: finalCanExplain }
            : m
        )
      )
      if (updated) saveConversationToDb(updated)

    } catch (err) {
      console.error(err)
      updateUiOnly(conversationId, (msgs) =>
        msgs.filter((m) => m.id !== assistantMessageId || m.content.trim().length > 0)
      )
      setError("The AI advisor is currently unavailable. Please try again shortly.")
    } finally {
      setIsLoading(false)
    }
  }

useEffect(() => {
  window.scrollTo(0, 0)
  const state = location.state as
    | {
        newChat?: boolean
        problemTitle?: string
        problemIntro?: string
        problemImage?: string
      }
    | undefined

  if (handledHautwissenStartRef.current) return
  if (!state?.newChat || !state.problemTitle) return

  handledHautwissenStartRef.current = true

  const now = new Date().toISOString()
  const conversationId = crypto.randomUUID()

  const newConversation = {
    id: conversationId,
    title: `Hautwissen: ${state.problemTitle}`,
    updatedAt: now,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: `I'd like AI advice about ${state.problemTitle}. ${state.problemIntro}`,
        imageUrl: state.problemImage ?? null,
      },
      {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: `Of course ✨ I can help you with **${state.problemTitle}**. Tell me more about what you need: suitable products, a routine, or ingredients.`,
      },
    ],
  }

  setChatState((s) => ({
    ...s,
    activeConversationId: conversationId,
    conversations: [newConversation, ...s.conversations],
  }))

  saveConversationToDb(newConversation)

  navigate('/chatbot', { replace: true, state: null })
}, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    sendMessage(input)
  }

  async function explainProduct(message: Message, product: ChatProduct) {
    if (explainingMessageId || isLoading || !activeConversation) return
    const conversationId = activeConversation.id
    const explanationId = `${message.id}-${product.id}`
    const lastUserMessage = messages
      .slice(0, messages.findIndex((m) => m.id === message.id))
      .reverse().find((m) => m.role === 'user')

    setExplainingMessageId(explanationId)
    setError(null)

    try {
      const res = await fetch(apiUrl('/api/chat/explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [product.id], message: lastUserMessage?.content ?? message.content }),
      })
      if (!res.ok) throw new Error()
      const data: { answer: string } = await res.json()

      const updated = applyMessages(conversationId, (msgs) => [
        ...msgs,
        { id: crypto.randomUUID(), role: 'assistant', content: data.answer },
      ])
      if (updated) saveConversationToDb(updated)
    } catch {
      setError("The AI explanation is currently unavailable. Please try again shortly.")
    } finally {
      setExplainingMessageId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#FBFAF7]">
      {conversationToDelete && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl">
            <h2 className="mb-4 text-xl sm:text-2xl font-bold text-foreground">Delete chat?</h2>
            <p className="mb-6 sm:mb-8 text-muted-foreground">Are you sure you want to delete this chat history?</p>
            <div className="flex gap-3 sm:gap-4">
              <Button type="button" variant="outline" onClick={() => setConversationToDelete(null)}
                className="flex-1 rounded-full border-border py-3 text-muted-foreground hover:bg-gray-50">
                Cancel
              </Button>
              <Button type="button"
                onClick={() => { deleteConversation(conversationToDelete!); setConversationToDelete(null) }}
                className="flex-1 rounded-full bg-[#D4A574] py-3 text-white hover:bg-[#C49464]">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAnalysis && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnalysis(false) }}
        >
          <div style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <SkinAnalysis
              onClose={() => setShowAnalysis(false)}
              onAnalysisComplete={(result, imageData) => {
                const hint = (result as any).multipleFaces
                  ? "\n\n⚠️ Multiple faces were detected. For an accurate analysis, please use a photo of just yourself."
                  : ''
                const assistantContent = `Skin analysis complete ✨\n\n**Skin type:** ${result.skinType}\n\nDryness: ${result.dryness}% · Redness: ${result.redness}% · Blemishes: ${result.blemishes}% · Sensitivity: ${result.sensitivity}%\n\n${result.overall}${hint}`
                const assistantMsgId = crypto.randomUUID()
                const isRealPhoto = imageData && imageData.startsWith('data:image')
                const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: "📸 Skin analysis started", imageUrl: imageData ?? null }
                const assistantMsg: Message = {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: assistantContent,
                }
                const conversationId = chatState.activeConversationId
                const updated = applyMessages(conversationId, (msgs) => [...msgs, userMsg, assistantMsg])
                if (updated) saveConversationToDb(updated)
                setShowAnalysis(false)
                // Quellbild für Glow-Button im State merken
                if (isRealPhoto) {
                  setGlowSources(prev => ({ ...prev, [assistantMsgId]: imageData! }))
                }
                // Automatisch Produkte basierend auf Hautanalyse suchen
                const skinTypeMap: Record<string, string> = {
                  Normal: "normal skin", Oily: "oily skin", Dry: "dry skin",
                  Combination: "Combination skin", Sensitive: "sensitive skin",
                }
                const concerns: string[] = []
                if (result.redness >= 50) concerns.push("Redness")
                if (result.blemishes >= 50) concerns.push("Blemishes")
                if (result.dryness >= 50) concerns.push("Dryness")
                if (result.sensitivity >= 50) concerns.push("sensitive skin")
                const skinLabel = skinTypeMap[result.skinType] || result.skinType
            const productQuery = concerns.length > 0
                  ? `Skin type: ${skinLabel}. Concerns: ${concerns.join(', ')}. Recommend suitable products.`
                  : `Skin type: ${skinLabel}. Recommend suitable products.`

                setTimeout(async () => {
                  const productMsgId = crypto.randomUUID()
                  const productMsg: Message = { id: productMsgId, role: 'assistant', content: '' }
                  applyMessages(conversationId, (msgs) => [...msgs, productMsg])
                  setIsLoading(true)
                  try {
                    const r = await fetch(apiUrl('/api/chat/stream'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: productQuery, history: [], contextProductIds: [], weather }),
                    })
                    if (!r.ok || !r.body) return
                    const reader = r.body.getReader()
                    const decoder = new TextDecoder()
                    let buf = '', finalAns = '', finalProds: ChatProduct[] = [], finalExplain = false
                    while (true) {
                      const { done, value } = await reader.read()
                      buf += decoder.decode(value, { stream: !done })
                      const evts = buf.split('\n\n'); buf = evts.pop() ?? ''
                      for (const evt of evts) {
                        const p = parseSseEvent(evt); if (!p) continue
                        if (p.event === 'delta' && p.data.text)
                          applyMessages(conversationId, (msgs) => msgs.map((m) => m.id === productMsgId ? { ...m, content: m.content + p.data.text! } : m))
                        if (p.event === 'done') { finalAns = p.data.answer ?? ''; finalProds = p.data.products ?? []; finalExplain = p.data.canExplainProducts ?? false }
                      }
                      if (done) break
                    }
                    const fin = applyMessages(conversationId, (msgs) => msgs.map((m) => m.id === productMsgId ? { ...m, content: finalAns || m.content, products: finalProds, canExplainProducts: finalExplain } : m))
                    if (fin) saveConversationToDb(fin)
                  } catch { } finally { setIsLoading(false) }
                }, 400)
              }}
            />
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-6xl px-4 pb-5 lg:pb-6">
        <div className="sticky top-0 z-20 mb-4 flex items-center gap-3 bg-[#FBFAF7] py-3 lg:py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E6D3]">
            <Sparkles className="h-4 w-4 text-[#A97745]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground !font-sans">AI advisor</h1>
            <p className="text-xs text-muted-foreground">Product recommendations from the SelfGlow catalog</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="self-start rounded-lg border border-border bg-background p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
            <Button type="button" onClick={startNewConversation} disabled={isLoading}
              className="mb-3 h-9 w-full rounded-full bg-[#D4A574] text-sm text-white hover:bg-[#C49464]">
              <Plus className="mr-2 h-4 w-4" />  New consultation
            </Button>
            <button type="button" onClick={() => setShowAnalysis(true)}
              className="mb-3 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3]">
              <Camera className="h-4 w-4" />  Analyze skin
            </button>

            {/* ── Wetter-Widget ── */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                  if (!weather) {
                    // Noch kein Wetter → Standort holen, dann senden
                    fetchWeather()
                    // Warten bis Wetter da ist, dann automatisch senden
                    const interval = setInterval(() => {
                      const w = weather as WeatherData | null
                      if (w?.weatherMain) {
                        clearInterval(interval)
                        setWeatherAnimation(w.weatherMain.toLowerCase())
                        setTimeout(() => setWeatherAnimation(null), 10000)
                        sendMessage(getWeatherRecommendationPrompt(w))
                      }
                    }, 500)
                    setTimeout(() => clearInterval(interval), 10000)
                  } else {
                    const w = weather as WeatherData
                    setWeatherAnimation(w.weatherMain?.toLowerCase() ?? 'clouds')
                    setTimeout(() => setWeatherAnimation(null), 10000)
                    sendMessage(getWeatherRecommendationPrompt(w))
                  }
                }}
              className="mb-3 flex h-9 w-full items-center justify-between gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] px-4 text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3] disabled:opacity-60"
            >
              <span>🌤️ Weather tips</span>
              <span className="text-xs opacity-70">→</span>
            </button>

            <h2 className="mb-3 text-sm font-semibold text-foreground">Chat history</h2>
            {isLoadingHistory && <p className="mb-2 text-xs text-muted-foreground">Loading chats...</p>}
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-18rem)]">
              {chatState.conversations.map((conversation) => {
                const isActive = conversation.id === chatState.activeConversationId
                return (
                  <div key={conversation.id}
                    className={cn('group flex w-full items-start gap-1 rounded-lg border p-1.5 transition-colors',
                      isActive ? 'border-[#D4A574] bg-[#FBFAF7]' : 'border-border hover:border-[#D4A574] hover:bg-[#FBFAF7]')}>
                    <button type="button" onClick={() => selectConversation(conversation.id)} disabled={isLoading}
                      className="min-w-0 flex-1 rounded-md px-1 py-1 text-left disabled:cursor-not-allowed disabled:opacity-60">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#A97745]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatConversationDate(conversation.updatedAt)}</p>
                        </div>
                      </div>
                    </button>
                    <button type="button" onClick={() => setConversationToDelete(conversation.id)} disabled={isLoading}
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label="Delete chat">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>

          <main className="space-y-4">
<section className="relative flex min-h-0 h-[calc(100dvh-180px)] flex-col rounded-lg border border-border bg-background overflow-hidden">              {/* ── Wetter-Animation ── */}
              {weatherAnimation && (
                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg">
                  {weatherAnimation === 'clear' && (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-yellow-100/60 via-orange-50/40 to-transparent">
                      <div className="absolute left-1/2 top-4 h-16 w-16 -translate-x-1/2 rounded-full bg-yellow-300/70 blur-xl animate-ping" />
                      <div className="absolute left-1/2 top-2 h-24 w-24 -translate-x-1/2 rounded-full bg-yellow-200/50 blur-2xl" />
                      {['10%','25%','40%','60%','75%','90%'].map((l, i) => (
                        <div key={i} className="absolute top-8 h-1 w-1 rounded-full bg-yellow-400/80"
                          style={{ left: l, animation: `ping ${1 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`, animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  )}
                  {(weatherAnimation === 'clouds' || weatherAnimation === 'overcast') && (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 to-transparent">
                      {[
                        { w: '120px', h: '40px', top: '8%',  left: '-10%',  dur: '8s',  delay: '0s' },
                        { w: '160px', h: '50px', top: '15%', left: '-20%',  dur: '12s', delay: '1s' },
                        { w: '100px', h: '35px', top: '5%',  left: '-15%',  dur: '10s', delay: '2s' },
                        { w: '140px', h: '45px', top: '20%', left: '-25%',  dur: '9s',  delay: '0.5s' },
                        { w: '180px', h: '55px', top: '3%',  left: '-30%',  dur: '14s', delay: '3s' },
                      ].map((c, i) => (
                        <div key={i} className="absolute rounded-full bg-white/70 blur-sm"
                          style={{ width: c.w, height: c.h, top: c.top, left: c.left,
                            animation: `slideRight ${c.dur} linear infinite`, animationDelay: c.delay }} />
                      ))}
                    </div>
                  )}
                  {(weatherAnimation === 'rain' || weatherAnimation === 'drizzle') && (
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-200/30 to-transparent">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="absolute w-px bg-blue-400/60 rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            height: `${8 + Math.random() * 12}px`,
                            top: '-10px',
                            animation: `rainfall ${0.6 + Math.random() * 0.8}s linear infinite`,
                            animationDelay: `${Math.random() * 1}s`,
                          }} />
                      ))}
                    </div>
                  )}
                  {weatherAnimation === 'snow' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 to-transparent">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="absolute text-white/80 text-sm select-none"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: '-20px',
                            animation: `snowfall ${2 + Math.random() * 3}s linear infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                          }}>❄️</div>
                      ))}
                    </div>
                  )}
                  {(weatherAnimation === 'mist' || weatherAnimation === 'fog' || weatherAnimation === 'haze') && (
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-300/40 via-gray-200/20 to-transparent animate-pulse" />
                  )}
                  {weatherAnimation === 'thunderstorm' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-transparent">
                      <div className="absolute left-1/2 top-0 text-4xl -translate-x-1/2 animate-bounce">⚡</div>
                    </div>
                  )}
                  {/* CSS für Animationen */}
                  <style>{`
                    @keyframes slideRight { from { transform: translateX(0); } to { transform: translateX(110vw); } }
                    @keyframes rainfall { from { transform: translateY(-10px); } to { transform: translateY(100vh); } }
                    @keyframes snowfall { from { transform: translateY(-20px) rotate(0deg); } to { transform: translateY(100vh) rotate(360deg); } }
                  `}</style>
                </div>
              )}
              <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'assistant' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                          <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                        </div>
                      )}
                      <div className={cn('max-w-[min(620px,85%)] rounded-lg px-3 py-2 text-sm leading-relaxed',
                        message.role === 'user' ? 'bg-[#D4A574] text-white' : 'bg-[#F5F5F5] text-foreground')}>
                        {message.imageUrl && (
                          <img src={message.imageUrl} alt="Image" className="mb-2 max-h-48 w-auto rounded-md object-cover" />
                        )}
                        {message.role === 'assistant' && message.content.trim().length === 0
                          ? <span className="text-muted-foreground">Thinking...</span>
                          : renderMessageContent(message)}
                      </div>
                      {message.role === 'user' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground">
                          <User className="h-3.5 w-3.5 text-background" />
                        </div>
                      )}
                    </div>

                    {/* Glow-Button: erscheint nach Hautanalyse-Nachrichten */}
                    {message.role === 'assistant' && glowSources[message.id] && (
                      <div className="ml-0 sm:ml-9 mt-1">
                        {glowLoadingForMsg === message.id ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#A97745]" />
                            ✨ Creating your glow image...
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => generateGlowImage(glowSources[message.id], chatState.activeConversationId, message.id)}
                            disabled={glowLoadingForMsg !== null}
                            className="flex items-center gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] px-4 py-2 text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3] disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            ✨ Show me my glowing skin
                          </button>
                        )}
                      </div>
                    )}

                    {message.products && message.products.length > 0 && (
                      <div className="ml-0 sm:ml-9 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {message.products.slice(0, 3).map((product) => (
                          <div key={product.id} className="overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md">
                            <Link to={`/product/${product.id}?from=chatbot`} className="group block">
                              <div className="flex gap-2 p-2">
                                <ProductImage src={product.imageUrl || 'https://placehold.co/120x120?text=Kein+Bild'} alt={product.name}
                                  className="h-16 w-16 shrink-0 rounded-md bg-[#F5F5F5] object-cover" />
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">{displayLabel(product.category)}</p>
                                  <h3 className="line-clamp-2 text-sm font-medium group-hover:text-[#D4A574]">{product.name}</h3>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
                                  <p className="mt-1 text-sm font-semibold">€{product.price.toFixed(2)}</p>
                                  {product.recommendationBullets && product.recommendationBullets.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {product.recommendationBullets.slice(0, 4).map((b) => (
                                        <span key={b} className="rounded-full bg-[#FDF7F0] px-2 py-0.5 text-[11px] leading-4 text-[#7A5A3A]">{b}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                            {message.canExplainProducts && (
                              <div className="border-t border-border px-2 py-2">
                                <Button type="button" variant="outline"
                                  onClick={() => explainProduct(message, product)}
                                  disabled={Boolean(explainingMessageId) || isLoading}
                                  className="h-8 w-full rounded-full border-[#E8D5C0] px-3 text-xs text-[#A97745] hover:bg-[#FDF7F0]">
                                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                  {explainingMessageId === `${message.id}-${product.id}` ? "AI is explaining..." : "Ask AI to explain"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                      <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                    </div>
                    <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-muted-foreground">Thinking...</div>
                  </div>
                )}



                {explainingMessageId && !isLoading && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                      <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                    </div>
                    <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-muted-foreground">AI is explaining the product...</div>
                  </div>
                )}
              </div>

              {error && <div className="border-t border-border px-3 py-2 text-sm text-red-600 md:px-4">{error}</div>}

              <form onSubmit={handleSubmit} className="border-t border-border p-3 md:p-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAnalysis(true)} title="Analyze skin"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e0c9a8] bg-[#FDF6EE] text-[#A97745] transition-colors hover:bg-[#F5E6D3]">
                    <Camera className="h-4 w-4" />
                  </button>
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your skin type, concerns, or product preferences..."
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-[#D4A574]"
                    disabled={isLoading} />
                  <Button type="submit" disabled={isLoading || input.trim().length === 0}
                    className="h-10 w-10 shrink-0 rounded-full bg-[#D4A574] p-0 text-white hover:bg-[#C49464]"
                    aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </section>

            <section className="rounded-lg border border-border bg-background p-3 sm:p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground !font-sans">Quick start</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {personalizedStarterQuestions.map((q) => (
                  <button key={q.label} type="button"
                    onClick={() => sendMessage(q.message, q.contextProductIds)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-[#D4A574] hover:bg-[#FBFAF7] disabled:cursor-not-allowed disabled:opacity-60">
                    {q.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                This advice uses products from our catalog and does not replace medical advice.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}