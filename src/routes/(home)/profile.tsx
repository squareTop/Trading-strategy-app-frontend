import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  User as UserIcon,
  Mail,
  Calendar,
  Fingerprint,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/utils'

export const Route = createFileRoute('/(home)/profile')({
  head: () => ({
    meta: [
      {
        title: 'User Profile | FoxelSignal',
      },
    ],
  }),
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const { user, isLoading, isAuthenticated, logout, isLoggingOut } = useAuth()

  // Route protection: redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: '/login',
        search: { redirect: '/profile' },
      })
    }
  }, [isLoading, isAuthenticated, navigate])

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center animate-pulse mb-4">
          <Lock className="w-6 h-6 text-brand-primary" />
        </div>
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
          Loading profile...
        </p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono font-semibold mb-3">
          <UserIcon className="w-4 h-4" />
          <span>Account Overview</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-display text-brand-dark tracking-tight">
          User Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage your account credentials and personal settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="md:col-span-1 bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || user.email}
              className="w-20 h-20 rounded-full border-2 border-brand-primary/30 object-cover shadow-xs mb-4"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-brand-primary/10 border-2 border-brand-primary/20 text-brand-primary font-display font-black text-2xl flex items-center justify-center mb-4">
              {(user.full_name || user.username || user.email)[0].toUpperCase()}
            </div>
          )}

          <h2 className="font-display font-bold text-lg text-brand-dark leading-tight">
            {user.full_name || user.username || 'Member'}
          </h2>
          <p className="text-xs font-mono text-gray-500 mt-0.5 break-all">
            {user.email}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg text-[11px] font-mono font-medium text-gray-600 border border-brand-border">
              {user.oauth_provider === 'google' ? 'Google OAuth' : 'Password Auth'}
            </span>
            {user.is_superuser && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-mono font-semibold">
                Admin
              </span>
            )}
          </div>

          <div className="w-full border-t border-brand-border my-6"></div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100/70 hover:text-rose-700 transition-colors text-xs font-mono font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>

        {/* Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 mb-4">
              Profile Details
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-brand-bg/40 border border-brand-border/60">
                <dt className="text-gray-400 font-mono flex items-center gap-1.5 mb-1">
                  <Fingerprint className="w-3.5 h-3.5 text-brand-primary" />
                  <span>User ID</span>
                </dt>
                <dd className="font-mono font-bold text-brand-dark text-[11px] truncate" title={user.id}>
                  {user.id}
                </dd>
              </div>

              <div className="p-3.5 rounded-xl bg-brand-bg/40 border border-brand-border/60">
                <dt className="text-gray-400 font-mono flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Primary Email</span>
                </dt>
                <dd className="font-sans font-medium text-brand-dark truncate" title={user.email}>
                  {user.email}
                </dd>
              </div>

              <div className="p-3.5 rounded-xl bg-brand-bg/40 border border-brand-border/60">
                <dt className="text-gray-400 font-mono flex items-center gap-1.5 mb-1">
                  <UserIcon className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Username</span>
                </dt>
                <dd className="font-sans font-medium text-brand-dark">
                  {user.username || <span className="text-gray-400 italic">Not set</span>}
                </dd>
              </div>

              <div className="p-3.5 rounded-xl bg-brand-bg/40 border border-brand-border/60">
                <dt className="text-gray-400 font-mono flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Member Since</span>
                </dt>
                <dd className="font-mono text-brand-dark">
                  {user.created_at ? formatDate(user.created_at) : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Account Security Info Box */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 mb-4">
              Security & Access
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-brand-bg/30 border border-brand-border/60">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-brand-dark">Account Status</p>
                    <p className="text-[11px] text-gray-500">Your account is verified and active</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-brand-bg/30 border border-brand-border/60">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-brand-primary" />
                  <div>
                    <p className="font-semibold text-brand-dark">Authentication Method</p>
                    <p className="text-[11px] text-gray-500">
                      {user.oauth_provider === 'google'
                        ? 'Google Single Sign-On (OIDC)'
                        : 'Local Credentials (Argon2id)'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand-bg text-gray-600 border border-brand-border">
                  {user.oauth_provider === 'google' ? 'Google' : 'Password'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
