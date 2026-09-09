import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { UserPlus, ArrowRight, AlertCircle, Lock, Mail, User, Loader2 } from 'lucide-react'
import { useAuth, getGoogleAuthUrl } from '../../lib/auth'

export const Route = createFileRoute('/(home)/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      {
        title: 'Create Account | FoxelSignal',
      },
    ],
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const { user, register, isRegistering, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate({ to: redirect || '/profile' })
    }
  }, [isAuthenticated, user, navigate, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Please enter an email and password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    try {
      await register({
        email: email.trim(),
        password,
        username: username.trim() || undefined,
        full_name: fullName.trim() || undefined,
      })
      navigate({ to: redirect || '/profile' })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to create account. Please try again.')
      }
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl()
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black font-display text-brand-dark tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Join FoxelSignal for quant strategy intelligence
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-sans">{errorMessage}</div>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-brand-border rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-border"></div>
          </div>
          <span className="relative px-3 bg-white text-[11px] font-mono text-gray-400 uppercase tracking-wider">
            Or sign up with email
          </span>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Email <span className="text-brand-primary">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-brand-bg/30 border border-brand-border rounded-xl text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-sans"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-brand-bg/30 border border-brand-border rounded-xl text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-sans"
                />
                <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2.5 text-xs bg-brand-bg/30 border border-brand-border rounded-xl text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Password <span className="text-brand-primary">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-brand-bg/30 border border-brand-border rounded-xl text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-sans"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full flex items-center justify-center gap-2 mt-6 px-4 py-2.5 bg-brand-dark text-white hover:bg-brand-primary transition-colors rounded-xl text-xs font-bold font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-8 text-center text-xs text-gray-500 font-sans">
          Already have an account?{' '}
          <Link
            to="/login"
            search={{ redirect }}
            className="font-bold text-brand-primary hover:text-brand-primary-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
