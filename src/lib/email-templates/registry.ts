import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as studioBookingConfirmation } from './studio-booking-confirmation'
import { template as checkoutCancellation } from './checkout-cancellation'
import { template as blockBookingConfirmation } from './block-booking-confirmation'
import { template as liveStreamStarted } from './live-stream-started'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'studio-booking-confirmation': studioBookingConfirmation,
  'checkout-cancellation': checkoutCancellation,
  'block-booking-confirmation': blockBookingConfirmation,
  'live-stream-started': liveStreamStarted,
}
