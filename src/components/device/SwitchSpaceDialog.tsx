import { AlertCircle, ArrowRightLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDialogSessionReset } from '@/hooks/useDialogSessionReset'
import { useSwitchSpace } from '@/hooks/useSwitchSpace'
import { formatPairingCode } from '@/lib/invitation-code'
import { cn } from '@/lib/utils'

interface SwitchSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "加入其他空间" 流程的 dialog。
 *
 * 状态机：input → migrating → (success | failed)。
 * - input：邀请码 + 新口令输入；提交后进入 migrating。
 * - migrating：发起 switchSpace HTTP 请求，并以 1s 间隔轮询
 *   queryMigrationProgress 把当前 phase 显示给用户。
 * - success：展示 migrated_records 后自动关闭，并刷新 roster。
 * - failed：按 SwitchSpaceErrorKind 显示具体提示，提供重试。
 */
export default function SwitchSpaceDialog({ open, onOpenChange }: SwitchSpaceDialogProps) {
  const { sessionKey, onOpenChangeComplete } = useDialogSessionReset()
  return (
    <SwitchSpaceDialogInner
      key={sessionKey}
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    />
  )
}

function SwitchSpaceDialogInner({
  open,
  onOpenChange,
  onOpenChangeComplete,
}: SwitchSpaceDialogProps & { onOpenChangeComplete: (open: boolean) => void }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'devices.switchSpace' })
  const {
    step,
    code,
    errorKind,
    result,
    canSubmit,
    retryLabel,
    failureMessage,
    setCode,
    handleSubmit,
    handleRetry,
    handleCancelPending,
  } = useSwitchSpace({ onOpenChange })

  // ── 主体内容 ─────────────────────────────────────────
  let body: React.ReactNode
  if (step === 'input') {
    body = (
      <div className="mx-auto w-fit max-w-full space-y-5 py-2">
        <div className="space-y-2">
          <Label htmlFor="switch-code" className="sr-only">
            {t('labels.code')}
          </Label>
          <Input
            id="switch-code"
            value={formatPairingCode(code)}
            onChange={e => setCode(e.target.value)}
            aria-invalid={
              errorKind === 'invitation_not_found' ||
              errorKind === 'invitation_expired' ||
              undefined
            }
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-[22ch] rounded-md text-center font-mono"
            placeholder="123-456-ABCDEFGHJK"
            onKeyDown={e => {
              if (e.key === 'Enter') void handleSubmit()
            }}
          />
        </div>
      </div>
    )
  } else if (step === 'migrating') {
    body = (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-ui-section font-semibold text-foreground">{t('migrating.title')}</p>
          <p className="mt-1 text-ui-body text-muted-foreground">
            {t('migrating.phase.preparing')}
          </p>
        </div>
      </div>
    )
  } else if (step === 'pending') {
    body = (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-ui-section font-semibold text-foreground">{t('pending.title')}</p>
          <p className="mt-1 text-ui-body text-muted-foreground">{t('pending.subtitle')}</p>
        </div>
      </div>
    )
  } else if (step === 'success' && result) {
    body = (
      <div data-testid="switch-space-success" className="flex flex-col items-center gap-3 py-8">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>
        <div className="text-center">
          <p className="text-ui-section font-semibold text-foreground">{t('success.title')}</p>
          <p className="mt-1 text-ui-body text-muted-foreground">
            <Trans
              t={t}
              i18nKey="success.subtitle"
              count={result.joinedSpace.migratedRecords ?? 0}
              values={{ count: result.joinedSpace.migratedRecords ?? 0 }}
            />
          </p>
          {(result.joinedSpace.preservedUnreadableRecords ?? 0) > 0 && (
            <p className="mt-2 text-ui-body text-muted-foreground">
              {t('success.preservedUnreadable', {
                count: result.joinedSpace.preservedUnreadableRecords ?? 0,
              })}
            </p>
          )}
        </div>
      </div>
    )
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertCircle className="size-7" />
        </div>
        <div className="text-center">
          <p className="text-ui-section font-semibold text-foreground">{t('failed.title')}</p>
          {failureMessage && (
            <p className="mt-1 text-ui-body text-muted-foreground">{failureMessage}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Footer ───────────────────────────────────────────
  let footer: React.ReactNode = null
  if (step === 'input') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('actions.cancel')}
        </Button>
        <Button
          data-testid="switch-space-submit"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="min-w-28"
        >
          <ArrowRightLeft className={cn('mr-2 size-4', !canSubmit && 'opacity-50')} />
          {t('actions.switch')}
        </Button>
      </>
    )
  } else if (step === 'migrating') {
    // Disable dialog actions while migration is running. The root cancels
    // every close request until the state machine leaves this step.
    footer = (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 size-4 animate-spin" />
        {t('actions.switching')}
      </Button>
    )
  } else if (step === 'pending') {
    footer = (
      <Button variant="outline" onClick={() => void handleCancelPending()}>
        {t('actions.cancel')}
      </Button>
    )
  } else if (step === 'failed') {
    footer = (
      <>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t('actions.close')}
        </Button>
        {errorKind === 'unreadable_history_confirmation_required' ? (
          <Button onClick={() => void handleSubmit(true)}>
            {t('actions.preserveAndContinue')}
          </Button>
        ) : (
          <Button onClick={handleRetry}>{retryLabel}</Button>
        )}
      </>
    )
  }
  // success: 自动关闭，无 footer

  return (
    <Dialog
      onOpenChangeComplete={onOpenChangeComplete}
      open={open}
      onOpenChange={(next, eventDetails) => {
        // 迁移中阻止关闭，避免用户误触导致状态机从 GUI 视角看起来"丢失"
        if (step === 'migrating' && !next) {
          eventDetails.cancel()
          return
        }
        onOpenChange(next)
      }}
    >
      <DialogContent data-testid="switch-space-dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {step === 'success'
              ? t('success.title')
              : step === 'failed'
                ? t('failed.title')
                : step === 'migrating'
                  ? t('migrating.title')
                  : step === 'pending'
                    ? t('pending.title')
                    : t('title')}
          </DialogTitle>
          {step === 'input' && <DialogDescription>{t('subtitle')}</DialogDescription>}
        </DialogHeader>

        {body}

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
