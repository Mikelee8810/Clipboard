import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { SettingGroup } from '../SettingGroup'
import { SettingRow } from '../SettingRow'
import { openLogsDirectory, useDiagnosticsSettings } from './useDiagnosticsSettings'

export function DiagnosticsSettings() {
  const { t } = useTranslation()
  const { exportingLogs, exportPath, handleCopyExportPath, handleExportLogs, isBusy } =
    useDiagnosticsSettings()

  return (
    <SettingGroup title={t('settings.sections.general.logsDirectory.title')}>
      <SettingRow
        label={t('settings.sections.general.logs.export.label')}
        description={t('settings.sections.general.logs.export.description')}
      >
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLogs}
            disabled={isBusy || exportingLogs}
          >
            {exportingLogs
              ? t('settings.sections.general.logs.export.exporting')
              : t('settings.sections.general.logs.export.button')}
          </Button>
          {exportPath && (
            <div className="flex max-w-96 items-center gap-2 text-ui-caption text-muted-foreground">
              <span className="truncate">{exportPath}</span>
              <Button variant="ghost" size="sm" onClick={handleCopyExportPath}>
                {t('settings.sections.general.logs.export.copyPath')}
              </Button>
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label={t('settings.sections.general.logsDirectory.label')}
        description={t('settings.sections.general.logsDirectory.description')}
      >
        <Button variant="outline" size="sm" onClick={openLogsDirectory}>
          {t('settings.sections.general.logsDirectory.button')}
        </Button>
      </SettingRow>
    </SettingGroup>
  )
}
