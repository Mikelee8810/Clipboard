import { useState } from 'react'
import { useNavigate } from 'react-router'
import RePairingNotice from '@/components/RePairingNotice'
import { useSetupRealtimeStore } from '@/store/setupRealtimeStore'

const RE_PAIRING_NOTICE_DISMISSED_KEY = 'uc-re-pairing-notice-dismissed'

/** Show the engine-owned re-pairing notice after the encryption gate opens. */
export default function StartupModals() {
  const navigate = useNavigate()
  const { rePairingRequired } = useSetupRealtimeStore()
  const [rePairingNoticeHandled, setRePairingNoticeHandled] = useState(
    () => localStorage.getItem(RE_PAIRING_NOTICE_DISMISSED_KEY) === '1'
  )

  const handleOpenDevices = () => {
    setRePairingNoticeHandled(true)
    navigate('/devices')
  }

  const handleDontShowAgain = () => {
    localStorage.setItem(RE_PAIRING_NOTICE_DISMISSED_KEY, '1')
    setRePairingNoticeHandled(true)
  }

  if (rePairingRequired && !rePairingNoticeHandled) {
    return (
      <RePairingNotice onOpenDevices={handleOpenDevices} onDontShowAgain={handleDontShowAgain} />
    )
  }

  return null
}
