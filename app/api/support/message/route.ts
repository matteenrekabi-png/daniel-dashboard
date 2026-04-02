import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await getClientByUserId(user.id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const { message } = await request.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

    // Save to Supabase so it shows in admin messages panel
    const admin = createAdminClient()
    await admin.from('support_messages').insert({
      client_id: client.id,
      client_name: client.business_name,
      email: client.email,
      message: message.trim(),
    })

    // Also send email as before
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.sendMail({
        from: `"${client.business_name}" <${process.env.SMTP_USER}>`,
        replyTo: client.email,
        to: 'matteenrekabi@superior-ai.org',
        subject: `Dashboard message from ${client.business_name}`,
        text: `From: ${client.business_name} (${client.email})\n\n${message}`,
        html: `<div style="font-family:sans-serif;max-width:600px"><h3 style="color:#1e40af">Message from ${client.business_name}</h3><p style="color:#666">From: ${client.email}</p><div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:12px"><p style="white-space:pre-wrap;color:#111">${message}</p></div></div>`,
      })
    } catch {
      // Email failure is non-fatal — message is already saved to DB
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Support message error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
