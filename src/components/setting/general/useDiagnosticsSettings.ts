import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { exportLogs } from '@/api/daemon/diagnostics'
import * as storageApi from '@/api/storage'
import { toast } from '@/components/ui/toast'
import { commands } from '@/lib/ipc'
import { createLogger } from '@/lib/logger'

const log = createLogger('general-section')

export function useDiagnosticsSettings() {
  const { t } = useTranslation()
  const [exportPath, setExportPath] = useState<string | null>(null)
  const [exportingLogs, setExportingLogs] = useState(false)

  const handleExportLogs = async () => {
    setExportingLogs(true)
    try {
      let path: string | null
      let exportNotice: 'complete' | 'partial' | 'offline' = 'complete'
      try {
        const result = await exportLogs(24)
        path = result.path
        if (
          result.enginePreparation.flush !== 'completed' ||
          result.collection.unreadableFiles.length > 0 ||
          result.collection.truncatedFiles.length > 0
        ) {
          exportNotice = 'partial'
        }
      } catch (daemonError) {
        log.warn({ err: daemonError }, 'Daemon export unavailable; using retained logs')
        path = await commands.exportStartupLogs()
        if (!path) return
        exportNotice = 'offline'
      }
      if (!path) return
      setExportPath(path)
      if (exportNotice === 'complete') {
        toast.success(t('settings.sections.general.logs.export.success'))
      } else {
        toast.message(
          t(
            exportNotice === 'offline'
              ? 'settings.sections.general.logs.export.offlineSuccess'
              : 'settings.sections.general.logs.export.partialSuccess'
          )
        )
      }
      try {
        await storageApi.revealPath(path)
      } catch (revealError) {
        log.warn({ err: revealError }, 'Failed to reveal exported log archive')
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to export logs')
      toast.error(t('settings.sections.general.logs.export.error'))
    } finally {
      setExportingLogs(false)
    }
  }

  const handleCopyExportPath = async () => {
    if (!exportPath) return
    try {
      await navigator.clipboard.writeText(exportPath)
      toast.success(t('settings.sections.general.logs.export.copySuccess'))
    } catch (error) {
      log.warn({ err: error }, 'Failed to copy log export path')
      toast.error(t('settings.sections.general.logs.export.copyError'))
    }
  }

  return {
    exportPath,
    exportingLogs,
    isBusy: exportingLogs,
    handleExportLogs,
    handleCopyExportPath,
  }
}

export async function openLogsDirectory() {
  try {
    await storageApi.openLogsDirectory()
  } catch (error) {
    log.error({ err: error }, 'Failed to open logs directory')
  }
}
