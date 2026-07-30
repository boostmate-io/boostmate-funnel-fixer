import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { z } from 'npm:zod@3.23.8'

const SITE_NAME = 'Boostmate'
const SENDER_DOMAIN = 'notify.app.boostmate.io'
const FROM_ADDRESS = 'Boostmate <noreply@app.boostmate.io>'
const DEFAULT_REDIRECT = 'https://app.boostmate.io/'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const MAX_LIST_USER_PAGES = 20
const LIST_USERS_PAGE_SIZE = 1000

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('signup'),
    email: z.string().email().max(320),
    password: z.string().min(6).max(128),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    accountType: z.enum(['standard', 'agency']).default('standard'),
    redirectTo: z.string().url().optional(),
  }),
  z.object({
    action: z.literal('resend'),
    email: z.string().email().max(320),
    redirectTo: z.string().url().optional(),
  }),
])

type Client = ReturnType<typeof createClient>
type AuthUser = {
  id: string
  email?: string
  email_confirmed_at?: string | null
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlJson(value: Record<string, unknown>) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)))
}

async function createSignature(secret: string, payload: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64Url(new Uint8Array(signature))
}

async function createConfirmationToken(secret: string, payload: Record<string, unknown>) {
  const encodedPayload = base64UrlJson(payload)
  const signature = await createSignature(secret, encodedPayload)
  return `${encodedPayload}.${signature}`
}

function normalizeRedirect(input?: string) {
  if (!input) return DEFAULT_REDIRECT
  try {
    const url = new URL(input)
    const allowedHosts = new Set(['app.boostmate.io', 'boostmate.lovable.app', 'localhost'])
    if (!['https:', 'http:'].includes(url.protocol)) return DEFAULT_REDIRECT
    if (!allowedHosts.has(url.hostname)) return DEFAULT_REDIRECT
    return url.toString()
  } catch {
    return DEFAULT_REDIRECT
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildEmailHtml(params: { recipient: string; confirmationUrl: string }) {
  const recipient = escapeHtml(params.recipient)
  const confirmationUrl = escapeHtml(params.confirmationUrl)
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#ffffff;font-family:Inter,Arial,sans-serif;color:#202633;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:32px 28px;">
        <p style="margin:0 0 18px;color:#6246ff;font-size:13px;font-weight:700;">Boostmate</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:800;color:#202633;">Confirm your email</h1>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#6b7280;">You're one step away from saving your Growth Assessment and building your roadmap in Boostmate.</p>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#6b7280;">Please confirm <a href="mailto:${recipient}" style="color:inherit;text-decoration:underline;">${recipient}</a> by clicking the button below.</p>
        <a href="${confirmationUrl}" style="display:inline-block;background:#6246ff;color:#ffffff;border-radius:12px;padding:13px 22px;font-size:15px;font-weight:700;text-decoration:none;">Confirm email</a>
        <p style="margin:30px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`
}

function buildEmailText(params: { confirmationUrl: string }) {
  return `Confirm your Boostmate email\n\nYou're one step away from saving your Growth Assessment and building your roadmap in Boostmate.\n\nConfirm your email: ${params.confirmationUrl}\n\nIf you didn't create an account, you can safely ignore this email.`
}

async function findUserByEmail(client: Client, email: string): Promise<AuthUser | null> {
  const normalized = email.toLowerCase()
  for (let page = 1; page <= MAX_LIST_USER_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: LIST_USERS_PAGE_SIZE })
    if (error) throw error
    const users = data?.users ?? []
    const found = users.find((user) => user.email?.toLowerCase() === normalized)
    if (found) {
      return {
        id: found.id,
        email: found.email,
        email_confirmed_at: found.email_confirmed_at,
      }
    }
    if (users.length < LIST_USERS_PAGE_SIZE) break
  }
  return null
}

async function sendConfirmationEmail(params: {
  client: Client
  apiKey: string
  user: AuthUser
  email: string
  redirectTo: string
  source: string
}) {
  if (params.user.email_confirmed_at) {
    return { ok: true, status: 'already_confirmed' as const }
  }

  const { data: suppressed, error: suppressedError } = await params.client
    .from('suppressed_emails')
    .select('reason')
    .eq('email', params.email.toLowerCase())
    .maybeSingle()

  if (suppressedError) throw suppressedError
  if (suppressed) {
    const messageId = crypto.randomUUID()
    await params.client.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup',
      recipient_email: params.email,
      status: 'suppressed',
      error_message: `Suppressed recipient: ${suppressed.reason ?? 'unknown'}`,
      metadata: { source: params.source, sender_domain: SENDER_DOMAIN, from: FROM_ADDRESS },
    })
    return { ok: false, status: 'suppressed' as const, messageId }
  }

  const redirectTo = normalizeRedirect(params.redirectTo)
  const redirectUrl = new URL(redirectTo)
  const expiresAt = Date.now() + TOKEN_TTL_MS
  const token = await createConfirmationToken(params.apiKey, {
    user_id: params.user.id,
    email: params.email.toLowerCase(),
    redirect_to: redirectTo,
    exp: expiresAt,
    purpose: 'email_confirmation',
  })
  const confirmationUrl = new URL('/auth/confirm', redirectUrl.origin)
  confirmationUrl.searchParams.set('token', token)

  const messageId = crypto.randomUUID()
  const metadata = {
    source: params.source,
    sender_domain: SENDER_DOMAIN,
    from: FROM_ADDRESS,
    confirmation_url_origin: confirmationUrl.origin,
  }

  const { error: pendingError } = await params.client.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'signup',
    recipient_email: params.email,
    status: 'pending',
    metadata,
  })
  if (pendingError) throw pendingError

  try {
    await sendLovableEmail(
      {
        to: params.email,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject: 'Confirm your Boostmate account',
        html: buildEmailHtml({ recipient: params.email, confirmationUrl: confirmationUrl.toString() }),
        text: buildEmailText({ confirmationUrl: confirmationUrl.toString() }),
        purpose: 'transactional',
        label: 'signup',
        message_id: messageId,
        idempotency_key: `auth-confirm-${params.user.id}-${Math.floor(Date.now() / 60000)}`,
      },
      { apiKey: params.apiKey },
    )

    const { error: sentError } = await params.client.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup',
      recipient_email: params.email,
      status: 'sent',
      metadata: { ...metadata, provider_response: 'accepted' },
    })
    if (sentError) throw sentError

    console.log('Signup confirmation email accepted', {
      email: params.email,
      messageId,
      senderDomain: SENDER_DOMAIN,
      from: FROM_ADDRESS,
      source: params.source,
    })
    return { ok: true, status: 'sent' as const, messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await params.client.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup',
      recipient_email: params.email,
      status: 'failed',
      error_message: message.slice(0, 1000),
      metadata,
    })
    console.error('Signup confirmation email failed', {
      email: params.email,
      messageId,
      senderDomain: SENDER_DOMAIN,
      from: FROM_ADDRESS,
      source: params.source,
      error: message,
    })
    return { ok: false, status: 'failed' as const, messageId, error: message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!supabaseUrl || !serviceRoleKey || !apiKey) {
    console.error('Missing signup email configuration', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasApiKey: Boolean(apiKey),
    })
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  let parsed: z.infer<typeof BodySchema>
  try {
    const json = await req.json()
    const result = BodySchema.safeParse(json)
    if (!result.success) {
      return jsonResponse({ error: result.error.flatten().fieldErrors }, 400)
    }
    parsed = result.data
  } catch {
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400)
  }

  const client = createClient(supabaseUrl, serviceRoleKey)
  const email = parsed.email.toLowerCase().trim()
  const redirectTo = normalizeRedirect(parsed.redirectTo)

  try {
    if (parsed.action === 'resend') {
      const existing = await findUserByEmail(client, email)
      if (!existing) {
        return jsonResponse({ ok: true, status: 'not_found_if_exists_email_sent' })
      }
      const delivery = await sendConfirmationEmail({ client, apiKey, user: existing, email, redirectTo, source: 'resend' })
      if (!delivery.ok) {
        return jsonResponse({ ok: false, status: delivery.status, messageId: delivery.messageId }, delivery.status === 'suppressed' ? 409 : 502)
      }
      return jsonResponse({ ok: true, status: delivery.status, messageId: delivery.messageId })
    }

    const firstName = parsed.firstName.trim()
    const lastName = parsed.lastName.trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ')
    const generatedAccountName = `${fullName}'s Workspace`

    const { data: created, error: createError } = await client.auth.admin.createUser({
      email,
      password: parsed.password,
      email_confirm: false,
      user_metadata: {
        account_type: parsed.accountType,
        account_name: generatedAccountName,
        first_name: firstName,
        last_name: lastName,
        display_name: fullName,
      },
    })

    let user: AuthUser | null = created.user
      ? { id: created.user.id, email: created.user.email, email_confirmed_at: created.user.email_confirmed_at }
      : null
    let source = 'signup_created'

    if (createError) {
      if (!/already|registered|exists/i.test(createError.message)) {
        throw createError
      }
      user = await findUserByEmail(client, email)
      source = 'signup_existing'
    }

    if (!user) {
      return jsonResponse({ ok: false, status: 'user_lookup_failed' }, 500)
    }

    if (user.email_confirmed_at) {
      return jsonResponse({ ok: false, status: 'existing_confirmed' }, 409)
    }

    const delivery = await sendConfirmationEmail({ client, apiKey, user, email, redirectTo, source })
    if (!delivery.ok) {
      return jsonResponse({ ok: false, status: delivery.status, messageId: delivery.messageId }, delivery.status === 'suppressed' ? 409 : 502)
    }

    return jsonResponse({
      ok: true,
      status: source === 'signup_existing' ? 'existing_unconfirmed_sent' : 'created_sent',
      userId: user.id,
      messageId: delivery.messageId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Signup confirmation flow failed', { email, action: parsed.action, error: message })
    return jsonResponse({ ok: false, status: 'failed', error: message }, 500)
  }
})