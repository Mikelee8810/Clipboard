import { ArrowUpCircle, Check, Layers, Monitor, Settings } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PackageManagerUpdateDialog } from '@/components/update/PackageManagerUpdateDialog'
import { UpdateDetails } from '@/components/update/UpdateDetails'
import { useSettingSelector } from '@/hooks/useSetting'
import { useUpdate } from '@/hooks/useUpdate'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

const log = createLogger('sidebar')

const NavButton: React.FC<{
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  portalContainer: React.RefObject<HTMLElement | null>
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  'data-settings-icon'?: boolean
}> = ({
  to,
  icon: Icon,
  label,
  isActive,
  portalContainer,
  onClick,
  'data-settings-icon': dataSettingsIcon,
}) => {
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              data-tauri-drag-region="false"
              data-settings-icon={dataSettingsIcon || undefined}
              to={to}
              className={cn(
                'group relative block size-10 rounded-lg',
                !isActive && 'hover:bg-muted'
              )}
              onClick={
                onClick
                  ? e => {
                      e.preventDefault()
                      onClick(e)
                    }
                  : undefined
              }
            />
          }
        >
          {isActive && (
            <div
              aria-hidden
              className="absolute inset-0 rounded-lg bg-primary/10 dark:bg-primary/20"
            />
          )}
          <div
            className={cn(
              'relative z-10 flex size-10 items-center justify-center rounded-lg',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
            )}
          >
            <Icon className="size-5" />
          </div>
        </TooltipTrigger>
        <TooltipContent
          portalContainer={portalContainer}
          side="right"
          align="center"
          className="font-medium"
        >
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Circular progress ring rendered around the update icon while the
 * background download is running. Total-unknown downloads pulse instead
 * of advancing (mirrors the dialog Progress bar `animate-pulse` fallback).
 */
const UpdateProgressRing: React.FC<{ percent: number | null }> = ({ percent }) => {
  // Radius 11 sits just outside the ArrowUpCircle glyph's visible outline
  // (~8.3px in the 40x40 viewBox), leaving a thin gap so the ring stays
  // legible against the icon while keeping the overall footprint close
  // to the icon's bounding box.
  const radius = 11
  const strokeWidth = 1.5
  const circumference = 2 * Math.PI * radius
  const isIndeterminate = percent === null
  const clamped = isIndeterminate ? 0 : Math.max(0, Math.min(100, percent))
  const offset = circumference * (1 - clamped / 100)

  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none',
        isIndeterminate && 'motion-safe:animate-pulse'
      )}
    >
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-amber-500/25 dark:stroke-amber-400/25"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={isIndeterminate ? circumference * 0.65 : offset}
        transform="rotate(-90 20 20)"
        className="stroke-amber-500 dark:stroke-amber-400"
        style={{ transition: isIndeterminate ? undefined : 'stroke-dashoffset 200ms linear' }}
      />
    </svg>
  )
}

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const sidebarRef = useRef<HTMLElement>(null)
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const autoCheckUpdate = useSettingSelector(({ setting }) => setting?.general.autoCheckUpdate)
  const [previousAutoCheckUpdate, setPreviousAutoCheckUpdate] = useState(autoCheckUpdate)
  if (previousAutoCheckUpdate !== autoCheckUpdate) {
    setPreviousAutoCheckUpdate(autoCheckUpdate)
    if (autoCheckUpdate === false && updateDialogOpen) setUpdateDialogOpen(false)
  }
  const [packageManagerDialogOpen, setPackageManagerDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const {
    state,
    isCheckingUpdate,
    installUpdate,
    downloadUpdate,
    cancelDownload,
    installKind,
    isManualUpdate,
  } = useUpdate()
  const phase = state.phase

  const isDownloading = phase === 'downloading'
  const isInstalling = phase === 'installing'
  const isReady = phase === 'ready'
  const isAvailable = phase === 'available'
  const indicatorVisible = isAvailable || isDownloading || isReady || isInstalling

  const downloadPercent =
    state.total !== null && state.total > 0
      ? Math.round((state.downloaded / state.total) * 100)
      : null

  const navItems = [
    { to: '/history', icon: Layers, label: t('nav.history') },
    { to: '/devices', icon: Monitor, label: t('nav.devices') },
  ]
  const indicatorLabel = (() => {
    if (isDownloading) {
      return downloadPercent !== null
        ? t('nav.updateDownloadingWithProgress', { percent: downloadPercent })
        : t('nav.updateDownloading')
    }
    if (isInstalling) return t('nav.updateInstalling')
    if (isReady) return t('nav.updateReady')
    return t('nav.updateAvailable')
  })()

  const handlePrimaryAction = async () => {
    if (isInstalling) return
    if (phase === 'idle') return
    try {
      // Both `available` and `ready` go through installUpdate — the backend
      // transparently falls back to `download_and_install` when no cached
      // bytes exist.
      await installUpdate()
      setUpdateDialogOpen(false)
    } catch (error) {
      log.error({ err: error }, '更新失败')
      toast.error(t('update.installFailed'))
    }
  }

  const handleStartBackgroundDownload = () => {
    setUpdateDialogOpen(false)
    downloadUpdate().catch(error => {
      log.error({ err: error }, '后台下载失败')
      toast.error(t('update.downloadFailed'))
    })
  }

  const handleCancelDownload = async () => {
    if (!isDownloading || cancelling) return
    setCancelling(true)
    try {
      await cancelDownload()
    } catch (error) {
      log.error({ err: error }, '取消下载失败')
    } finally {
      setCancelling(false)
    }
  }

  const handleIndicatorClick = () => {
    if (isManualUpdate) {
      setPackageManagerDialogOpen(true)
    } else {
      setUpdateDialogOpen(true)
    }
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        data-tauri-drag-region
        className={cn(
          'relative z-10 w-14 h-full shrink-0 flex flex-col items-center py-4',
          'bg-transparent',
          className
        )}
      >
        {/* Main Navigation */}
        <div className="relative z-10 flex flex-col gap-3 w-full items-center">
          {navItems.map(item => (
            <NavButton
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.to}
              portalContainer={sidebarRef}
            />
          ))}
        </div>

        <div data-tauri-drag-region className="flex-1 w-full min-h-0" />

        {/* Bottom Navigation */}
        <div className="relative z-10 flex flex-col gap-3 w-full items-center">
          {indicatorVisible && (
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={indicatorLabel}
                      data-update-state={phase}
                      data-tauri-drag-region="false"
                      className="group relative size-10 rounded-lg hover:bg-muted"
                      onClick={handleIndicatorClick}
                      disabled={isCheckingUpdate}
                    />
                  }
                >
                  <div
                    className={cn(
                      'relative z-10 flex size-10 items-center justify-center rounded-lg',
                      isReady
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    <ArrowUpCircle className="size-5" />

                    {isAvailable && (
                      <span
                        aria-hidden
                        className="absolute top-2.5 right-2.5 flex size-2 motion-reduce:hidden"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500/70 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                      </span>
                    )}
                    {isAvailable && (
                      <span
                        aria-hidden
                        className="hidden motion-reduce:flex absolute top-2.5 right-2.5 size-2 rounded-full bg-amber-500"
                      />
                    )}

                    {(isDownloading || isInstalling) && (
                      <UpdateProgressRing percent={isInstalling ? null : downloadPercent} />
                    )}

                    {isReady && (
                      <span
                        aria-hidden
                        className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow"
                      >
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  portalContainer={sidebarRef}
                  side="right"
                  align="center"
                  className="font-medium"
                >
                  <p>{indicatorLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <NavButton
            to="/settings"
            icon={Settings}
            label={t('nav.settings')}
            isActive={location.pathname.startsWith('/settings')}
            portalContainer={sidebarRef}
            onClick={() => {
              if (location.pathname.startsWith('/settings')) return
              navigate('/settings')
            }}
          />
        </div>
      </aside>
      <AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('update.title')}</AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-3">
              <UpdateDetails
                currentVersion={state.info?.currentVersion}
                version={state.info?.version}
                body={state.info?.body}
                phase={phase}
                percent={downloadPercent}
                showReadyHint={isReady}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isDownloading ? (
              <>
                <AlertDialogCancel
                  onClick={event => {
                    event.preventDefault()
                    void handleCancelDownload()
                  }}
                  disabled={cancelling}
                >
                  {cancelling ? t('update.cancelling') : t('update.cancelDownload')}
                </AlertDialogCancel>
                <AlertDialogAction disabled>{t('update.downloading')}</AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogCancel disabled={isInstalling}>{t('update.later')}</AlertDialogCancel>
                {isAvailable && (
                  <AlertDialogAction
                    onClick={event => {
                      event.preventDefault()
                      handleStartBackgroundDownload()
                    }}
                    disabled={isInstalling}
                  >
                    {t('update.downloadInBackground')}
                  </AlertDialogAction>
                )}
                <AlertDialogAction
                  onClick={event => {
                    event.preventDefault()
                    void handlePrimaryAction()
                  }}
                  disabled={isInstalling || phase === 'idle'}
                >
                  {isReady ? t('update.installNow') : t('update.updateNow')}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {installKind && (
        <PackageManagerUpdateDialog
          open={packageManagerDialogOpen}
          onOpenChange={setPackageManagerDialogOpen}
          installKind={installKind}
          updateInfo={state.info}
        />
      )}
    </>
  )
}

export default Sidebar
