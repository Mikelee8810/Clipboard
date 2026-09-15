import { useTranslation } from 'react-i18next'
import { SettingGroup } from '@/components/setting/SettingGroup'
import { SettingRow } from '@/components/setting/SettingRow'
import { useOptimisticSetting } from '@/components/setting/useOptimisticSetting'
import { Switch } from '@/components/ui'
import { useSetting } from '@/hooks/useSetting'
import { FileSyncSettingsGroup } from './FileSyncSettingsGroup'

const SyncSection: React.FC = () => {
  const { t } = useTranslation()
  // Use setting context
  const { setting, error, updateSyncSetting } = useSetting()

  const [syncEnabled, setSyncEnabled] = useOptimisticSetting(
    setting?.sync.syncEnabled ?? true,
    next => updateSyncSetting({ syncEnabled: next }),
    { failureLog: 'Failed to change sync setting' }
  )
  const [autoSyncEnabled, setAutoSyncEnabled] = useOptimisticSetting(
    setting?.sync.autoSyncEnabled ?? true,
    next => updateSyncSetting({ autoSyncEnabled: next }),
    { failureLog: 'Failed to change auto-sync setting' }
  )
  const [syncOnRestore, setSyncOnRestore] = useOptimisticSetting(
    setting?.sync.syncOnRestore ?? false,
    next => updateSyncSetting({ syncOnRestore: next }),
    { failureLog: 'Failed to change sync-on-restore setting' }
  )
  // Show error message if any
  if (error) {
    return (
      <div className="text-destructive py-4">
        {t('settings.sections.sync.loadError')} {error}
      </div>
    )
  }

  return (
    <>
      <SettingGroup title={t('settings.sectionHeadings.syncBehavior')}>
        <SettingRow
          label={t('settings.sections.sync.syncEnabled.label')}
          description={t('settings.sections.sync.syncEnabled.description')}
        >
          <Switch
            id="sync-enabled"
            aria-label={t('settings.sections.sync.syncEnabled.label')}
            checked={syncEnabled}
            onCheckedChange={setSyncEnabled}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.sections.sync.autoSync.label')}
          description={t('settings.sections.sync.autoSync.description')}
        >
          <Switch
            id="auto-sync"
            aria-label={t('settings.sections.sync.autoSync.label')}
            checked={autoSyncEnabled}
            onCheckedChange={setAutoSyncEnabled}
            disabled={!syncEnabled}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.sections.sync.syncOnRestore.label')}
          description={t('settings.sections.sync.syncOnRestore.description')}
        >
          <Switch
            id="sync-on-restore"
            aria-label={t('settings.sections.sync.syncOnRestore.label')}
            checked={syncOnRestore}
            onCheckedChange={setSyncOnRestore}
            disabled={!syncEnabled}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.sections.sync.syncFrequency.label')}
          description={t('settings.sections.sync.syncFrequency.description')}
        >
          <span className="text-ui-body text-muted-foreground">
            {t('settings.sections.sync.syncFrequency.realtime')}
          </span>
        </SettingRow>
      </SettingGroup>

      <FileSyncSettingsGroup syncEnabled={syncEnabled} />
    </>
  )
}

export default SyncSection
