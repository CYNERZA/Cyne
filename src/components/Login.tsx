import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { AuthService } from '../services/auth'
import { logError } from '../utils/log'
import { AnimatedLogo } from './AnimatedLogo'

interface LoginProps {
  onComplete: () => void
}

export function Login({ onComplete }: LoginProps): React.ReactNode {
  const [status, setStatus] = useState<
    | 'starting'
    | 'waiting'
    | 'polling'
    | 'success'
    | 'error'
  >('starting')
  const [userCode, setUserCode] = useState<string>('')
  const [verificationUri, setVerificationUri] = useState<string>('')
  const [deviceCode, setDeviceCode] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [pollInterval, setPollInterval] = useState<number>(5)

  useEffect(() => {
    startDeviceFlow()
  }, [])

  useEffect(() => {
    if (status === 'polling' && deviceCode) {
      const interval = setInterval(() => {
        pollForAuth()
      }, pollInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [status, deviceCode, pollInterval])

  const startDeviceFlow = async () => {
    try {
      const response = await AuthService.startDeviceFlow()
      setUserCode(response.user_code)
      setVerificationUri(response.verification_uri)
      setDeviceCode(response.device_code)
      setPollInterval(response.interval)
      setStatus('waiting')

      // Auto-start polling after 2 seconds
      setTimeout(() => {
        setStatus('polling')
      }, 2000)
    } catch (err) {
      console.error('Failed to start device flow:', err)
      logError(err)
      setError(
        err instanceof Error ? err.message : 'Failed to start authentication',
      )
      setStatus('error')
    }
  }

  const pollForAuth = async () => {
    try {
      const response = await AuthService.pollDeviceAuth(deviceCode)

      if (response.status === 'ok' && response.access_token) {
        // Save token
        AuthService.saveToken({
          access_token: response.access_token,
          token_type: response.token_type || 'Bearer',
          expires_in: response.expires_in || 604800,
          user: response.user || { email: '', id: '' },
        })

        setStatus('success')
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else if (response.status === 'error') {
        setError(response.error || 'Authentication failed')
        setStatus('error')
      }
      // If pending, continue polling
    } catch (err) {
      console.error('Failed to poll for auth:', err)
      logError(err)
      // Don't set error status on poll failures, just continue polling
    }
  }

  if (status === 'starting') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>{' '}
          <Text>Starting authentication...</Text>
        </Text>
      </Box>
    )
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">✖ Authentication failed</Text>
        <Text color="red">{error}</Text>
        <Text dimColor>Please try again or contact support.</Text>
      </Box>
    )
  }

  if (status === 'success') {
    const userInfo = AuthService.getUserInfo()
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✔ Successfully authenticated!</Text>
        {userInfo && <Text dimColor>Logged in as: {userInfo.email}</Text>}
      </Box>
    )
  }

  // Main login display for 'waiting' and 'polling' states
  return (
    <Box flexDirection="column" padding={1}>
      {/* Animated logo - larger and more engaging during login */}
      <Box marginBottom={2} justifyContent="center">
        <AnimatedLogo state="active" size="medium" />
      </Box>

      <Box marginBottom={1} justifyContent="center">
        <Text bold color="cyan">Cyne Authentication</Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text>
          1. Open your browser and visit:{' '}
          <Text bold color="cyan">
            {verificationUri}
          </Text>
        </Text>
        <Text>
          2. Enter this code: <Text bold color="yellow">{userCode}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        {status === 'polling' ? (
          <Text>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>{' '}
            <Text dimColor>Waiting for authorization...</Text>
          </Text>
        ) : (
          <Text dimColor>Ready to authenticate</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Note: This window will automatically close once you complete
          authentication.
        </Text>
      </Box>
    </Box>
  )
}

export default Login
