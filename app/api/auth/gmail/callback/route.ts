import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getCabinetConfig } from '@/lib/gmail'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/parametres?tab=email&error=auth_failed', req.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(new URL('/parametres?tab=email&error=no_tokens', req.url))
    }

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const config = await getCabinetConfig()

    if (config) {
      await supabase.from('cabinet_config').update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: expiry,
        gmail_connected: true,
        gmail_history_id: null, // Reset pour resynchro
      }).eq('id', config.id)
    } else {
      await supabase.from('cabinet_config').insert({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: expiry,
        gmail_connected: true,
      })
    }

    return NextResponse.redirect(new URL('/parametres?tab=email&success=connected', req.url))
  } catch (e) {
    console.error('Gmail OAuth error:', e)
    return NextResponse.redirect(new URL('/parametres?tab=email&error=server_error', req.url))
  }
}
