import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const DEFAULT_REDIRECT = 'https://app.boostmate.io/'

const BodySchema = z.object({ token: z.string().min(20).max(5000) })

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
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
  return new Uint8Array(signature)
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i]
  return diff === 0
}

async function verifyToken(secret: string, token: string) {
  const [payloadPart, signaturePart] = token.split('.')
  if (!payloadPart || !signaturePart) return null

  const expectedSignature = await createSignature(secret, payloadPart)
  const actualSignature = base64UrlToBytes(signaturePart)
  if (!timingSafeEqual(expectedSignature, actualSignature)) return null

  const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadPart))
  const parsed = z.object({
    user_id: z.string().uuid(),
    email: z.string().email(),
    redirect_to: z.string().url().optional(),
    exp: z.number(),
    purpose: z.literal('email_confirmation'),
  }).safeParse(JSON.parse(payloadJson))

  if (!parsed.success) return null
  if (parsed.data.exp < Date.now()) return null
  return parsed.data
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
    console.error('Missing confirm email configuration', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasApiKey: Boolean(apiKey),
    })
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  let token: string
  try {
    const json = await req.json()
    const result = BodySchema.safeParse(json)
    if (!result.success) {
      return jsonResponse({ error: result.error.flatten().fieldErrors }, 400)
    }
    token = result.data.token
  } catch {
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400)
  }

  const payload = await verifyToken(apiKey, token)
  if (!payload) {
    return jsonResponse({ ok: false, status: 'invalid_or_expired' }, 400)
  }

  const client = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await client.auth.admin.updateUserById(payload.user_id, {
    email_confirm: true,
  })

  if (error) {
    console.error('Email confirmation failed', { userId: payload.user_id, email: payload.email, error: error.message })
    return jsonResponse({ ok: false, status: 'confirmation_failed' }, 500)
  }

  console.log('Email confirmed', { userId: payload.user_id, email: payload.email })
  return jsonResponse({ ok: true, status: 'confirmed', redirectTo: normalizeRedirect(payload.redirect_to) })
})