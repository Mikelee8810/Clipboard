import { DeviceNameSettings } from '@/components/setting/general/DeviceNameSettings'
import { DiagnosticsSettings } from './general/DiagnosticsSettings'
import { LanguageSettings } from './general/LanguageSettings'
import { SoundSettings } from './general/SoundSettings'
import { StartupSettings } from './general/StartupSettings'

export default function GeneralSection() {
  return (
    <>
      <DeviceNameSettings />
      <StartupSettings />
      <LanguageSettings />
      <SoundSettings />
      <DiagnosticsSettings />
    </>
  )
}
