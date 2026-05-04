'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/hooks/useNotifications'

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onAfterClick?: () => void
  /** Su mobile usiamo avatar 40px e font leggermente piu' piccolo */
  compact?: boolean
}

const TYPE_CONFIG: Record<
  string,
  { emoji: string; bar: string; verb: string; aria: string }
> = {
  comment: { emoji: '💬', bar: '#2D5A27', verb: 'ha commentato', aria: 'Commento' },
  like:    { emoji: '❤️', bar: '#E53935', verb: 'ha messo mi piace a', aria: 'Like' },
  save:    { emoji: '🔖', bar: '#4CAF50', verb: 'ha salvato', aria: 'Salvataggio' },
  tip:     { emoji: '🪙', bar: '#C8A951', verb: 'ti ha mandato una mancia per', aria: 'Mancia' },
  follow:  { emoji: '👤', bar: '#1565C0', verb: 'ha iniziato a seguirti', aria: 'Nuovo follower' },
  unlock:  { emoji: '🔓', bar: '#1565C0', verb: 'ha sbloccato', aria: 'Sblocco' },
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'ora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`
  if (diff < 604800) return `${Math.floor(diff / 86400)}g fa`
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export default function NotificationItem({
  notification: notif,
  onRead,
  onAfterClick,
  compact = false,
}: NotificationItemProps) {
  const router = useRouter()
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.comment

  const actorName =
    notif.actor?.author_pseudonym ||
    notif.actor?.name ||
    notif.data?.actor_name ||
    'Qualcuno'
  const actorAvatar = notif.actor?.avatar_url || null
  const actorHandle = notif.actor?.username || notif.actor?.id || notif.actor_id

  const bookId = notif.data?.book_id
  const bookTitle = notif.data?.book_title || notif.data?.title

  const profileHref = actorHandle ? `/profile/${actorHandle}` : null
  const bookHref = bookId
    ? notif.type === 'comment'
      ? `/reader/${bookId}/${notif.data?.block_number || 1}`
      : `/libro/${bookId}`
    : null

  const primaryHref = bookHref || profileHref

  const handleRowClick = (e: React.MouseEvent) => {
    // Se l'utente clicca su un link interno (nome, titolo) lasciamo gestire al link
    const target = e.target as HTMLElement
    if (target.closest('a[data-stop]')) return
    if (!notif.read) onRead(notif.id)
    if (onAfterClick) onAfterClick()
    if (primaryHref) router.push(primaryHref)
  }

  const avatarSize = compact ? 'w-10 h-10' : 'w-11 h-11'
  const avatarText = compact ? 'text-base' : 'text-lg'
  const titleSize = compact ? 'text-[12px]' : 'text-[13px]'
  const subSize = compact ? 'text-[11px]' : 'text-[11px]'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      className={`group relative flex items-stretch gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-sage-50/70 dark:border-sage-800/50 last:border-b-0 ${
        !notif.read
          ? 'bg-cream-200/60 dark:bg-sage-800/30 hover:bg-cream-200 dark:hover:bg-sage-800/50'
          : 'bg-white dark:bg-[#1e221c] hover:bg-sage-50/70 dark:hover:bg-sage-900/30'
      }`}
    >
      {/* Pallino non-letta accanto all'avatar */}
      {!notif.read && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sage-500"
          aria-label="Non letta"
        />
      )}

      {/* Avatar + badge tipo */}
      <div className="relative flex-shrink-0 self-start mt-0.5 ml-1">
        {actorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={actorAvatar}
            alt={actorName}
            className={`${avatarSize} rounded-full object-cover ring-1 ring-sage-100 dark:ring-sage-700`}
          />
        ) : (
          <div
            className={`${avatarSize} rounded-full bg-sage-500 text-white ${avatarText} font-bold flex items-center justify-center ring-1 ring-sage-100 dark:ring-sage-700`}
          >
            {actorName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Badge tipo: angolo basso-destra dell'avatar */}
        <span
          aria-label={cfg.aria}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#1e221c] border border-sage-100 dark:border-sage-700 text-[11px] flex items-center justify-center shadow-sm"
        >
          {cfg.emoji}
        </span>
      </div>

      {/* Testo strutturato */}
      <div className="flex-1 min-w-0 pr-2">
        <p className={`${titleSize} text-bark-500 dark:text-sage-400 leading-snug`}>
          {profileHref ? (
            <Link
              href={profileHref}
              data-stop
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-sage-900 dark:text-sage-100 hover:underline"
            >
              {actorName}
            </Link>
          ) : (
            <span className="font-semibold text-sage-900 dark:text-sage-100">
              {actorName}
            </span>
          )}{' '}
          <span>{cfg.verb}</span>
          {bookTitle && bookHref && (
            <>
              {' '}
              <Link
                href={bookHref}
                data-stop
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-sage-600 dark:text-sage-300 hover:text-sage-700 dark:hover:text-sage-200 hover:underline break-words"
              >
                «{bookTitle}»
              </Link>
            </>
          )}
          {!bookTitle && notif.message && (
            <span className="text-bark-500 dark:text-sage-400"> — {notif.message}</span>
          )}
        </p>
        <p className={`${subSize} text-bark-400 dark:text-sage-500 mt-0.5`}>
          {getTimeAgo(notif.created_at)}
        </p>
      </div>

      {/* Barra colorata verticale a destra */}
      <span
        aria-hidden
        className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full"
        style={{ backgroundColor: cfg.bar }}
      />
    </div>
  )
}
