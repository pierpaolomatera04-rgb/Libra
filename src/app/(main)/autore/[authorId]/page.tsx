'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// Redirect da /autore/[id] a /profile/[username o id]
export default function AuthorRedirectPage() {
  const params = useParams()
  const authorId = params.authorId as string
  const router = useRouter()
  const supabase = createClient()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const redirect = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', authorId)
        .single()

      if (data) {
        // Use username if available, otherwise use ID
        router.replace(`/profile/${data.username || data.id}`)
      } else {
        setNotFound(true)
      }
    }
    redirect()
  }, [authorId, router, supabase])

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-bark-500">Utente non trovato</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-sage-400" />
    </div>
  )
}
