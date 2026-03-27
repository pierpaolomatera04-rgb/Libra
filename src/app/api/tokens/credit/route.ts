import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { creditTokens, creditWelcomeTokens, creditMonthlyTokens, creditAnnualBonusTokens, PlanType, TokenType } from '@/lib/tokens'

// POST /api/tokens/credit — Accredita token a un utente
// Body: { type, amount?, plan? }
// type: 'welcome' | 'monthly' | 'annual_bonus' | 'purchased'
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, plan } = body

    let result: { success: boolean; error?: string }

    switch (type) {
      case 'welcome':
        result = await creditWelcomeTokens(supabase, user.id)
        break

      case 'monthly': {
        // Fetch piano utente se non fornito
        let userPlan = plan as PlanType
        if (!userPlan) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single()
          userPlan = (profile?.plan || 'free') as PlanType
        }
        result = await creditMonthlyTokens(supabase, user.id, userPlan)
        break
      }

      case 'annual_bonus': {
        let userPlan = plan as PlanType
        if (!userPlan) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single()
          userPlan = (profile?.plan || 'free') as PlanType
        }
        result = await creditAnnualBonusTokens(supabase, user.id, userPlan)
        break
      }

      case 'purchased':
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'amount è obbligatorio per token acquistati' }, { status: 400 })
        }
        result = await creditTokens(supabase, user.id, amount, 'PURCHASED_TOKEN')
        break

      default:
        return NextResponse.json({ error: `Tipo token non valido: ${type}` }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, type })
  } catch (err: any) {
    console.error('Errore POST /api/tokens/credit:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
