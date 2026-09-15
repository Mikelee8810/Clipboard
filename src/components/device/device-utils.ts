import { Laptop, Monitor, Smartphone, Tablet } from 'lucide-react'
import type { ContentTypes } from '@/api/daemon/member'

export function getDeviceIcon(deviceName?: string | null) {
  const name = deviceName?.toLowerCase() || ''
  if (name.includes('iphone') || name.includes('phone') || name.includes('android'))
    return Smartphone
  if (name.includes('ipad') || name.includes('tablet')) return Tablet
  if (
    name.includes('mac') ||
    name.includes('macbook') ||
    name.includes('pc') ||
    name.includes('windows')
  )
    return Laptop
  return Monitor
}

/** Maps ContentTypes fields to i18n keys */
export const contentTypeEntries: {
  field: keyof ContentTypes
  i18nKey: string
}[] = [
  { field: 'text', i18nKey: 'syncText' },
  { field: 'image', i18nKey: 'syncImage' },
  { field: 'file', i18nKey: 'syncFile' },
  { field: 'link', i18nKey: 'syncLink' },
  { field: 'richText', i18nKey: 'syncRichText' },
]
