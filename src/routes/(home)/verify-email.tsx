import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react'
import { useAuth, verifyEmail, resendVerificationEmail } from '../../lib/auth'

export const Route = createFileRoute('/(home)/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    message: typeof search.message === 'string' ? search.message : undefined,
  }),
  head: () => ({
    meta: [
      {
        title: 'Verify Email | FoxelSignal',
      },
    ],
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token, status: initialStatus, message } = Route.useSearch()
  const navigate = useNavigate()
  const { user, refetchUser, isAuthenticated } = useAuth()

  const [verificationState, setVerificationState] = useState<
    'loading' | 'success' | 'error'
  >(initialStatus === 'success' ? 'success' : 'loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialStatus === 'error'
      ? message || 'The verification link is invalid or has expired.'
      : null
  )
  const [resendEmail, setResendEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  useEffect(() => {
    // If redirected with success status directly from backend GET endpoint
    if (initialStatus === 'success') {
      setVerificationState('success')
      refetchUser()
      return
    }

    // If redirected with error status directly from backend GET endpoint
    if (initialStatus === 'error') {
      setVerificationState('error')
      return
    }

    // If token provided in search params, perform verification call
    if (token) {
      let isMounted = true
      verifyEmail(token)
        .then(() => {
          if (!isMounted) return
          setVerificationState('success')
          refetchUser()
        })
        .catch((err: Error) => {
          if (!isMounted) return
          setVerificationState('error')
          setErrorMessage(err.message || 'Verification token is invalid or has expired.')
        })
      return () => {
        isMounted = false
      }
    } else {
      setVerificationState('error')
      setErrorMessage('No verification token provided in link.')
    }
  }, [token, initialStatus, message, refetchUser])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resendEmail.trim() || user?.email
    if (!targetEmail) return

    setIsResending(true)
    setResendMessage(null)
    try {
      const msg = await resendVerificationEmail(targetEmail)
      setResendMessage(msg)
    } catch {
      setResendMessage('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-sm animate-fade-in text-center">
        {verificationState === 'loading' && (
          <div className="py-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary mb-4 animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h1 className="text-2xl font-black font-display text-brand-dark tracking-tight">
              Verifying Your Email
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-2">
              Validating your verification token with FoxelSignal...
            </p>
          </div>
        )}

        {verificationState === 'success' && (
          <div className="py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black font-display text-brand-dark tracking-tight">
              Email Verified!
            </h1>
            <p className="text-xs text-gray-500 mt-2 font-sans">
              Your email address has been verified successfully. You now have full access to FoxelSignal.
            </p>

            <div className="mt-8">
              {isAuthenticated ? (
                <Link
                  to="/profile"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-brand-dark font-bold font-display text-xs hover:bg-brand-primary/90 transition shadow-xs cursor-pointer"
                >
                  <span>Go to Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-brand-dark font-bold font-display text-xs hover:bg-brand-primary/90 transition shadow-xs cursor-pointer"
                >
                  <span>Sign In to Your Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {verificationState === 'error' && (
          <div className="py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black font-display text-brand-dark tracking-tight">
              Verification Failed
            </h1>
            <p className="text-xs text-rose-600 font-sans mt-2">
              {errorMessage}
            </p>

            {/* Resend Verification Form */}
            <form onSubmit={handleResend} className="mt-6 text-left border-t border-brand-border pt-6">
              <label className="block text-xs font-mono font-medium text-gray-700 mb-1.5">
                Resend verification email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail || user?.email || ''}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-3 py-2 text-xs border border-brand-border rounded-xl focus:outline-hidden focus:border-brand-primary font-sans"
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-semibold hover:bg-black transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isResending ? 'Sending...' : 'Resend'}
                </button>
              </div>
              {resendMessage && (
                <p className="text-[11px] text-gray-500 font-mono mt-2">
                  {resendMessage}
                </p>
              )}
            </form>

            <div className="mt-6">
              <Link
                to="/login"
                className="text-xs font-mono text-gray-500 hover:text-brand-dark transition"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
