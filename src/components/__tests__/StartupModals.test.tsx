import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StartupModals from '@/components/StartupModals'

const mockSetupSnapshot = { rePairingRequired: false }

vi.mock('@/store/setupRealtimeStore', () => ({
  useSetupRealtimeStore: () => mockSetupSnapshot,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderStartupModals() {
  return render(
    <MemoryRouter>
      <StartupModals />
      <LocationProbe />
    </MemoryRouter>
  )
}

describe('StartupModals', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSetupSnapshot.rePairingRequired = false
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('shows the Engine-owned re-pairing notice when required', async () => {
    mockSetupSnapshot.rePairingRequired = true

    renderStartupModals()

    expect(await screen.findByText('rePairingNotice.title')).toBeVisible()
  })

  it('opens device management and closes the re-pairing notice', async () => {
    mockSetupSnapshot.rePairingRequired = true
    const user = userEvent.setup()
    renderStartupModals()

    await user.click(await screen.findByText('rePairingNotice.goToDevices'))

    expect(screen.getByTestId('location')).toHaveTextContent('/devices')
    expect(screen.queryByText('rePairingNotice.title')).not.toBeInTheDocument()
  })

  it('renders no modal during normal startup', () => {
    renderStartupModals()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('rePairingNotice.title')).not.toBeInTheDocument()
  })

  it('remembers do not show again across startup remounts without navigating', async () => {
    mockSetupSnapshot.rePairingRequired = true
    const user = userEvent.setup()
    const view = renderStartupModals()

    await user.click(await screen.findByText('rePairingNotice.dontShowAgain'))

    expect(screen.queryByText('rePairingNotice.title')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    expect(localStorage.getItem('uc-re-pairing-notice-dismissed')).toBe('1')

    view.unmount()
    renderStartupModals()

    expect(screen.queryByText('rePairingNotice.title')).not.toBeInTheDocument()
  })

  it('still reminds on the next startup when only opening devices', async () => {
    mockSetupSnapshot.rePairingRequired = true
    const user = userEvent.setup()
    const view = renderStartupModals()

    await user.click(await screen.findByText('rePairingNotice.goToDevices'))
    view.unmount()
    renderStartupModals()

    expect(await screen.findByText('rePairingNotice.title')).toBeVisible()
  })

  it('does not show the notice after it was dismissed permanently', () => {
    mockSetupSnapshot.rePairingRequired = true
    localStorage.setItem('uc-re-pairing-notice-dismissed', '1')

    renderStartupModals()

    expect(screen.queryByText('rePairingNotice.title')).not.toBeInTheDocument()
  })
})
