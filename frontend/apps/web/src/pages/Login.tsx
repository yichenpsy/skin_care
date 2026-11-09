import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Check, CheckCircle2, Eye, EyeOff, Loader2, LogIn, UserPlus, X,
} from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { useAuth, type User } from '@/context/AuthContext'
import { cn } from '@workspace/ui/lib/utils'

type AuthResponse = { message?: string; token?: string; user?: User }
type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>
type LoginLocationState = { from?: { pathname?: string; search?: string; hash?: string } }
type Gender = 'male' | 'female' | 'diverse' | null

const emailPattern           = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const specialCharacterPattern = /[^A-Za-z0-9]/
const userNamePattern         = /^[A-Za-z0-9 _-]+$/

function getPasswordValidationMessage(password: string) {
  if (password.length < 8)                       return "Your password must be at least 8 characters long."
  if (!/[A-Z]/.test(password))                   return "Your password must contain at least one uppercase letter."
  if (!/[a-z]/.test(password))                   return "Your password must contain at least one lowercase letter."
  if (!/[0-9]/.test(password))                   return "Your password must contain at least one number."
  if (!specialCharacterPattern.test(password))   return "Your password must contain at least one special character."
  return ''
}

function getUserNameValidationMessage(userName: string) {
  if (!userName) return ''
  if (userName.length < 2 || userName.length > 30) return "Your username must be between 2 and 30 characters long."
  if (!userNamePattern.test(userName))             return "Your username can only contain letters, numbers, spaces, underscores, and hyphens."
  return ''
}

function PasswordRequirement({ fulfilled, text }: { fulfilled: boolean; text: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-xs transition-colors', fulfilled ? 'text-green-700' : 'text-muted-foreground')}>
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border transition-colors', fulfilled ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground/40')}>
        {fulfilled && <Check className="h-3 w-3" />}
      </span>
      {text}
    </div>
  )
}

// ── Gender Button ─────────────────────────────────────────────────────────────
function GenderButton({ label, emoji, selected, onClick }: {
  value: Gender; label: string; emoji: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 8px',
        borderRadius: 12,
        border: selected ? '2px solid #D4A574' : '1.5px solid #e0c9a8',
        background: selected ? '#FDF6EE' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'inherit',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ fontSize: 12, fontWeight: selected ? 600 : 400, color: selected ? '#D4A574' : '#7a5c42' }}>
        {label}
      </span>
      {selected && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A574' }} />
      )}
    </button>
  )
}

export default function Login() {
  const [mode,                setMode]                = useState<'login' | 'register' | 'verify'>('login')
  const [name,                setName]                = useState('')
  const [email,               setEmail]               = useState('')
  const [password,            setPassword]            = useState('')
  const [confirmPassword,     setConfirmPassword]     = useState('')
  const [gender,              setGender]              = useState<Gender>(null)
  const [rememberMe,          setRememberMe]          = useState(true)
  const [showPassword,        setShowPassword]        = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors,         setFieldErrors]         = useState<FieldErrors>({})
  const [error,               setError]               = useState('')
  const [success,             setSuccess]             = useState('')
  const [isSubmitting,        setIsSubmitting]        = useState(false)
  const [pendingEmail,        setPendingEmail]        = useState('')
  const [verifyCode,          setVerifyCode]          = useState('')

  const { login }       = useAuth()
  const navigate        = useNavigate()
  const location        = useLocation()
  const locationState   = location.state as LoginLocationState | null

  const passwordRequirements = [
    { text: "At least 8 characters",       fulfilled: password.length >= 8 },
    { text: "At least one uppercase letter", fulfilled: /[A-Z]/.test(password) },
    { text: "At least one lowercase letter", fulfilled: /[a-z]/.test(password) },
    { text: "At least one number",       fulfilled: /[0-9]/.test(password) },
    { text: "At least one special character", fulfilled: specialCharacterPattern.test(password) },
  ]

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('verified') === '1') {
      setMode('login')
      setSuccess("Email verified. You can now sign in.")
    }
  }, [location.search])

  function handleClose() { navigate(-1) }

  function validateForm() {
    const errors: FieldErrors = {}
    const normalizedEmail = email.trim()
    const normalizedName  = name.trim()

    if (!normalizedEmail)                            errors.email = "Enter your email address."
    else if (!emailPattern.test(normalizedEmail))    errors.email = "Enter a valid email address."

    if (!password)                                   errors.password = "Enter your password."
    else if (mode === 'register') {
      const msg = getPasswordValidationMessage(password)
      if (msg) errors.password = msg
    }

    if (mode === 'register') {
      const nameMsg = getUserNameValidationMessage(normalizedName)
      if (nameMsg) errors.name = nameMsg

      if (!confirmPassword)                          errors.confirmPassword = "Confirm your password."
      else if (confirmPassword !== password)         errors.confirmPassword = "Passwords do not match."
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(''); setSuccess(''); setFieldErrors({})
    if (!validateForm()) return
    setIsSubmitting(true)

    try {
      const response = await fetch(apiUrl(`/api/auth/${mode}`), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(mode === 'register' ? { name: name.trim(), gender: gender ?? undefined } : {}),
        }),
      })

      const data: AuthResponse = await response.json()

      if (!response.ok) {
        setError(data.message || "Something went wrong. Please try again.")
        return
      }

      if (mode === 'register') {
        setPendingEmail(email.trim())
        setMode('verify')
        setError('')
        setPassword(''); setConfirmPassword(''); setGender(null)
        return
      }

      if (!data.token || !data.user) {
        setError("User details are missing from the sign-in response.")
        return
      }

      login(data.token, { ...data.user, token: data.token }, rememberMe)
      navigate(
        `${locationState?.from?.pathname || '/'}${locationState?.from?.search || ''}${locationState?.from?.hash || ''}`,
        { replace: true }
      )
    } catch {
      setError("The server is unavailable. Please try again shortly.")
    } finally {
      setIsSubmitting(false)
    }
  }

  //verification code part
  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(apiUrl('/api/auth/verify-code'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: pendingEmail, code: verifyCode}),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Incorrect or expired code.")
        return
      }

      setSuccess("Email verified. You can now sign in.")
      setMode('login')
      setVerifyCode('')
    } catch {
      setError("Network error")
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError(''); setSuccess(''); setFieldErrors({})
    setPassword(''); setConfirmPassword(''); setGender(null)
  }

  //Verify Screen:
  if (mode === 'verify') {
    return (
      <div className='px-4 py-6 sm:py-10 sm:px-6 lg:px-8'>
        <form
          onSubmit={handleVerify}
          className='relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-sm'
          noValidate
          >
            <section className='flex flex-col gap-5 px-4 py-6 sm:px-8 sm:px-8 lg:px-10'>
              <div className='space-y-2'>
                <h2 className='text-xl sm:text-2xl font-bold text-foreground'>Verify email</h2>
                <p className='text-sm leading-6 text-muted-foreground'>We sent a 6-digit code to <strong className="break-all">{pendingEmail}</strong>  . Please enter it below.</p>
              </div>

              <label className='flex flex-col gap-2 text-sm font-medium text-foreground'>
                Verification code
                <input
                className='rounded-md border border-input bg-background px-3 py-2.5 text-xl font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574] tracking-[0.2em] sm:tracking-[0.3em] text-center'
                type='text'
                inputMode="numeric"
                maxLength={6}
                placeholder='- - - - - -'
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                />
              </label>

              {error && (
                <p className='rounded-md bg-red-50 px-3 py-2 text-sm text-red-600'>{error}</p>
              )}

              {success && (
                <p className='flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700'>
                  <CheckCircle2 className='h-4 w-4'/>{success}
                </p>
              )}

              <button 
                className='inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A574] px-4 py-3 font-medium text-white transition-colors hover:bg-[#C19660] disabled:cursor-not-allowed disabled:opacity-70'
                type='submit'
                disabled={isSubmitting || verifyCode.length !== 6}
              >
                {isSubmitting
                  ? <Loader2 className='h-4 w-4 animate-spin' />
                  : <CheckCircle2 className='h-4 w-4'/>
                }
                Verify code
              </button>

              <button
                type='button'
                className='text-sm font-medium text-[#8A6337] hover:underline'
                onClick={() => {setMode('login'); setVerifyCode(''); setError('')}}
              >
                Back to sign in
              </button>
            </section>
        </form>
      </div>
    )
  }

  //Login/Register screen
  const isLoginMode = mode === 'login'
  const title    = isLoginMode ? "Welcome back" : "Create account"
  const subtitle = isLoginMode
    ? "Sign in to continue shopping at SelfGlow."
    : "Save favorites, check out faster, and manage your skincare profile in one place."

  return (
    <div className="px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-sm"
        noValidate
      >
        <button type="button" onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 transition-colors hover:bg-accent"
          aria-label="Close">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <section className="flex flex-col gap-5 px-6 py-8 sm:px-8 lg:px-10">
          <div className="space-y-2 pr-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </div>

          {/* ── Registrierung: Name ── */}
          {mode === 'register' && (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              <span>Username <span className="font-normal text-muted-foreground">(optional)</span></span>
              <input
                className="rounded-md border border-input bg-background px-3 py-2.5 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                type="text" autoComplete="name" placeholder="Your username"
                value={name} onChange={e => setName(e.target.value)} aria-invalid={Boolean(fieldErrors.name)} />
              {fieldErrors.name && <span className="text-sm font-normal text-red-600">{fieldErrors.name}</span>}
            </label>
          )}

          {/* ── Registrierung: Geschlecht ── */}
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                I am <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <GenderButton value="female"  label="Woman"   emoji="👩" selected={gender === 'female'}  onClick={() => setGender(g => g === 'female'  ? null : 'female')} />
                <GenderButton value="male"    label="Man"   emoji="👨" selected={gender === 'male'}    onClick={() => setGender(g => g === 'male'    ? null : 'male')} />
                <GenderButton value="diverse" label="Non-binary" emoji="🧑" selected={gender === 'diverse'} onClick={() => setGender(g => g === 'diverse' ? null : 'diverse')} />
              </div>
              <p style={{ fontSize: 11, color: '#9a7a5a', margin: 0 }}>
                Used to personalize products and your home page.
              </p>
            </div>
          )}

          {/* ── E-Mail ── */}
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Email
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
              type="email" autoComplete="email" placeholder="your.name@example.com"
              value={email} onChange={e => setEmail(e.target.value)} aria-invalid={Boolean(fieldErrors.email)} />
            {fieldErrors.email && <span className="text-sm font-normal text-red-600">{fieldErrors.email}</span>}
          </label>

          {/* ── Passwort ── */}
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Password
            <div className="relative">
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-11 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)} />
              <button type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                onClick={() => setShowPassword(c => !c)}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {fieldErrors.password && <span className="text-sm font-normal text-red-600">{fieldErrors.password}</span>}
            {mode === 'register' && (
              <div className="mt-1 rounded-xl border border-[#E8D5C0] bg-[#FDF7F0] p-3 space-y-2">
                {passwordRequirements.map(r => <PasswordRequirement key={r.text} fulfilled={r.fulfilled} text={r.text} />)}
              </div>
            )}
          </label>

          {/* ── Passwort bestätigen ── */}
          {mode === 'register' && (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Confirm password
              <div className="relative">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-11 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                  type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Confirm password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} aria-invalid={Boolean(fieldErrors.confirmPassword)} />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setShowConfirmPassword(c => !c)}
                  aria-label={showConfirmPassword ? "hide" : "show"}>
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className="text-sm font-normal text-red-600">{fieldErrors.confirmPassword}</span>}
            </label>
          )}

          {/* ── Angemeldet bleiben ── */}
          {mode === 'login' && (
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-[#A9733F]"
                checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              Stay signed in on this device
            </label>
          )}

          {error   && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />{success}
            </p>
          )}

          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A574] px-4 py-3 font-medium text-white transition-colors hover:bg-[#C19660] disabled:cursor-not-allowed disabled:opacity-70"
            type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === 'login' ? "Sign in" : "Create account"}
          </button>

          <button type="button" className="text-sm font-medium text-[#8A6337] hover:underline text-center" onClick={switchMode}>
            {mode === 'login' ? "New to SelfGlow? Create an account" : "Already have an account? Sign in"}
          </button>
        </section>
      </form>
    </div>
  )
}