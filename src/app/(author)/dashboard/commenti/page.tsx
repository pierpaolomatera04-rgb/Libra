'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { MessageCircle, Loader2, BookOpen, Reply, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CommentiPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchComments = async () => {
      // Prima prendi i libri dell'autore
      const { data: books } = await supabase
        .from('books')
        .select('id, title')
        .eq('author_id', user.id)

      if (!books || books.length === 0) {
        setLoading(false)
        return
      }

      const bookIds = books.map((b: any) => b.id)
      const bookMap = Object.fromEntries(books.map((b: any) => [b.id, b.title]))

      // Commenti sui libri dell'autore
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, user:profiles!user_id(name, author_pseudonym, avatar_url)')
        .in('book_id', bookIds)
        .order('created_at', { ascending: false })
        .limit(50)

      if (commentsData) {
        setComments(commentsData.map((c: any) => ({
          ...c,
          bookTitle: bookMap[c.book_id] || 'Libro sconosciuto'
        })))
      }

      setLoading(false)
    }
    fetchComments()
  }, [user, supabase])

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm('Vuoi eliminare questo commento?')
    if (!confirmed) return

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      toast.error('Errore nell\'eliminazione')
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId))
      toast.success('Commento eliminato')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="w-7 h-7 text-sage-600" />
        <div>
          <h1 className="text-2xl font-bold text-sage-900">Commenti</h1>
          <p className="text-sm text-bark-400">{comments.length} commenti sui tuoi libri</p>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-sage-100">
          <MessageCircle className="w-16 h-16 text-sage-200 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-sage-800 mb-2">Nessun commento ancora</h2>
          <p className="text-sm text-bark-400">Quando i lettori commenteranno i tuoi libri, li vedrai qui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-2xl border border-sage-100 p-5">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {comment.user?.avatar_url ? (
                  <img src={comment.user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sage-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {(comment.user?.name || comment.user?.author_pseudonym || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-sage-800">
                      {comment.user?.author_pseudonym || comment.user?.name || 'Utente'}
                    </span>
                    <span className="text-[10px] text-bark-300">
                      {new Date(comment.created_at).toLocaleDateString('it-IT', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3 h-3 text-bark-300" />
                    <span className="text-[11px] text-bark-400">{comment.bookTitle}</span>
                  </div>

                  <p className="text-sm text-bark-600 leading-relaxed">{comment.content}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="flex items-center gap-1 text-xs text-bark-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
