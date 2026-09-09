import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ShieldCheck, User, ArrowLeft, Lock } from 'lucide-react'
import { useAuth } from '../../lib/auth'

export const Route = createFileRoute('/(home)/private')({
  head: () => ({
    meta: [
      {
        title: 'Private Area | FoxelSignal',
      },
    ],
  }),
  component: PrivatePage,
})

function PrivatePage() {
  const navigate = useNavigate()
  const { user, isLoading, isAuthenticated } = useAuth()

  // Route protection: redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: '/login',
        search: { redirect: '/private' },
      })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center animate-pulse mb-4">
          <Lock className="w-6 h-6 text-brand-primary" />
        </div>
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
          Checking credentials...
        </p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-2xl p-8 text-center shadow-xs">
        {/* Status Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-black font-display text-brand-dark tracking-tight mb-2">
          You are Authenticated!
        </h1>
        <p className="text-xs text-gray-500 font-sans leading-relaxed mb-6">
          This is a protected private route. You are successfully logged in and your session is verified by the backend.
        </p>

        {/* User preview badge */}
        <div className="p-3.5 rounded-xl bg-brand-bg/50 border border-brand-border text-left mb-6 flex items-center gap-3">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-brand-border shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-primary/15 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
              {(user.full_name || user.username || user.email)[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-brand-dark truncate font-display">
              {user.full_name || user.username || 'Member'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono truncate">
              {user.email}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
            Active
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            to="/profile"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-dark text-white hover:bg-brand-primary transition-colors rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-xs"
          >
            <User className="w-4 h-4" />
            <span>View Profile</span>
          </Link>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-border bg-white text-brand-dark hover:bg-brand-bg transition-colors rounded-xl text-xs font-bold font-mono uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
