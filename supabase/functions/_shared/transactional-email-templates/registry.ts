import type * as React from 'npm:react@18.3.1'
import { template as videoAuditRequest } from './video-audit-request.tsx'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient for internal notifications. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'video-audit-request': videoAuditRequest,
}
