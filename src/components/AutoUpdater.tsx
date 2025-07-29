import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../utils/theme'
import { gte } from 'semver'
import { useEffect, useState } from 'react'
import { isAutoUpdaterDisabled } from '../utils/config'
import {
  AutoUpdaterResult,
  getLatestVersion,
  installGlobalPackage,
} from '../utils/autoUpdater.js'
import { useInterval } from '../hooks/useInterval'
import { logEvent } from '../services/statsig'
import { MACRO } from '../constants/macros'
import { PRODUCT_COMMAND } from '../constants/product'

interface AutoUpdaterProps {
  debug: boolean
  isUpdating: boolean
  onChangeIsUpdating: (isUpdating: boolean) => void
  onAutoUpdaterResult: (autoUpdaterResult: AutoUpdaterResult) => void
  autoUpdaterResult: AutoUpdaterResult | null
}

interface VersionInfo {
  global?: string | null
  latest?: string | null
}

const DEVELOPMENT_ENVIRONMENTS = ['test', 'dev']
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000 // 30 minutes

export function AutoUpdater(props: AutoUpdaterProps): React.ReactNode {
  const {
    debug,
    isUpdating,
    onChangeIsUpdating,
    onAutoUpdaterResult,
    autoUpdaterResult,
  } = props
  
  const theme = getTheme()
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({})

  const performUpdateCheck = React.useCallback(async (): Promise<void> => {
    if (DEVELOPMENT_ENVIRONMENTS.includes(process.env.NODE_ENV || '')) {
      return
    }

    if (isUpdating) {
      return
    }

    const currentVersion = MACRO.VERSION
    const remoteVersion = await getLatestVersion()
    const updaterDisabled = true // await isAutoUpdaterDisabled()

    setVersionInfo({ 
      global: currentVersion, 
      latest: remoteVersion 
    })

    const shouldUpdate = 
      !updaterDisabled &&
      currentVersion &&
      remoteVersion &&
      !gte(currentVersion, remoteVersion)

    if (shouldUpdate) {
      const updateStartTime = Date.now()
      onChangeIsUpdating(true)
      
      const installResult = await installGlobalPackage()
      onChangeIsUpdating(false)

      const updateDuration = Date.now() - updateStartTime

      if (installResult === 'success') {
        logEvent('tengu_auto_updater_success', {
          fromVersion: currentVersion,
          toVersion: remoteVersion,
          durationMs: String(updateDuration),
        })
      } else {
        logEvent('tengu_auto_updater_fail', {
          fromVersion: currentVersion,
          attemptedVersion: remoteVersion,
          status: installResult,
          durationMs: String(updateDuration),
        })
      }

      onAutoUpdaterResult({
        version: remoteVersion!,
        status: installResult,
      })
    }
  }, [onAutoUpdaterResult, isUpdating, onChangeIsUpdating])

  useEffect(() => {
    // Initial update check (commented out)
    // performUpdateCheck()
  }, [performUpdateCheck])

  // Periodic update checks (commented out)
  // useInterval(performUpdateCheck, UPDATE_CHECK_INTERVAL)

  if (debug) {
    return (
      <Box flexDirection="row">
        <Text dimColor>
          globalVersion: {versionInfo.global} &middot; latestVersion:{' '}
          {versionInfo.latest}
        </Text>
      </Box>
    )
  }

  const hasVersions = versionInfo.global && versionInfo.latest
  const hasResult = autoUpdaterResult?.version

  if (!hasResult && !hasVersions) {
    return null
  }

  if (!hasResult && !isUpdating) {
    return null
  }

  const renderUpdateStatus = (): React.ReactNode => {
    if (isUpdating) {
      return (
        <Box>
          <Text color={theme.secondaryText} dimColor wrap="end">
            Auto-updating to v{versionInfo.latest}…
          </Text>
        </Box>
      )
    }

    if (autoUpdaterResult?.status === 'success' && autoUpdaterResult?.version) {
      return (
        <Text color={theme.success}>
          ✓ Update installed &middot; Restart to apply
        </Text>
      )
    }

    const failureStatuses = ['install_failed', 'no_permissions']
    if (failureStatuses.includes(autoUpdaterResult?.status || '')) {
      return (
        <Text color={theme.error}>
          ✗ Auto-update failed &middot; Try{' '}
          <Text bold>{PRODUCT_COMMAND} doctor</Text> or{' '}
          <Text bold>npm i -g cyne</Text>
        </Text>
      )
    }

    return null
  }

  return (
    <Box flexDirection="row">
      {debug && (
        <Text dimColor>
          globalVersion: {versionInfo.global} &middot; latestVersion:{' '}
          {versionInfo.latest}
        </Text>
      )}
      {renderUpdateStatus()}
    </Box>
  )
}
