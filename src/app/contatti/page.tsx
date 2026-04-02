import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ContattiPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Libra" className="h-10 sm:h-11" />
          </Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link href="/" className="flex items-center gap-2 text-sm text-bark-500 hover:text-sage-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Torna alla home
        </Link>
        <h1 className="text-3xl font-bold text-sage-900 mb-6">Contatti</h1>
        <div className="bg-white rounded-2xl border border-sage-100 p-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-sage-500" />
            <p className="text-bark-600">Per qualsiasi domanda o segnalazione, scrivici a:</p>
          </div>
          <p className="text-sage-700 font-medium">supporto@libra-app.it</p>
        </div>
      </div>
    </div>
  )
}
