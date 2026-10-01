// Server-only: records app-email outcomes in email_send_log after a managed send.
// A log write never decides the send result — failures are only logged.
import { EmailAPIError } from '@lovable.dev/email-js'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

export interface LogClient {
  from: (table: string) => any
}

export type SendOutcome = 'sent' | 'suppressed' | 'failed'

export async function sendAndLog(
  supabase: LogClient,
  args: {
    templateName: string
    to: string
    templateData?: Record<string, any>
    idempotencyKey: string
    messageId?: string | null
    metadata?: Record<string, any> | null
  },
): Promise<SendOutcome> {
  const base = {
    message_id: args.messageId ?? args.idempotencyKey,
    template_name: args.templateName,
    recipient_email: args.to,
    metadata: args.metadata ?? null,
  }
  const write = async (row: Record<string, any>) => {
    const { error } = await supabase.from('email_send_log').insert({ ...base, ...row })
    if (error) console.error('email_send_log write failed', { code: error.code, message: error.message })
  }

  const attempt = () =>
    sendTemplateEmail(args.templateName, args.to, {
      templateData: args.templateData,
      idempotencyKey: args.idempotencyKey,
    })

  try {
    let result
    try {
      result = await attempt()
    } catch (e) {
      if (e instanceof EmailAPIError && e.status === 429) {
        const wait = ((e as any).retryAfterSeconds ?? 60) * 1000
        await new Promise((r) => setTimeout(r, wait))
        result = await attempt()
      } else {
        throw e
      }
    }
    if (result.sent) {
      await write({ status: 'sent' })
      return 'sent'
    }
    await write({ status: 'suppressed' })
    return 'suppressed'
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('App email send failed', { template: args.templateName, message: msg })
    await write({ status: 'failed', error_message: msg })
    return 'failed'
  }
}
