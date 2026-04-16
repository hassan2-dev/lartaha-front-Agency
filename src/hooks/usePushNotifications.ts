/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { subscribeUserToPush, unsubscribeUserFromPush, getPushSubscription } from '../api/pushApi'

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const checkSubscription = useCallback(async () => {
    try {
      const subscription = await getPushSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking push subscription:', error)
    }
  }, [])

  useEffect(() => {
    console.log('🔔 [usePushNotifications] Checking push notification support...')
    console.log(
      '🔔 [usePushNotifications] serviceWorker in navigator:',
      'serviceWorker' in navigator
    )
    console.log('🔔 [usePushNotifications] PushManager in window:', 'PushManager' in window)
    console.log('🔔 [usePushNotifications] User agent:', navigator.userAgent)

    // Check basic support first
    const basicSupport = 'serviceWorker' in navigator && 'PushManager' in window
    console.log('🔔 [usePushNotifications] Basic support check:', basicSupport)

    if (basicSupport) {
      console.log(
        '🔔 [usePushNotifications] Basic support detected, checking service worker readiness...'
      )
      setIsSupported(true)

      // Check if service worker is already registered and ready
      navigator.serviceWorker
        .getRegistration()
        .then(registration => {
          if (registration) {
            console.log(
              '🔔 [usePushNotifications] Service worker already registered:',
              registration.scope
            )
            checkSubscription()
          } else {
            console.log(
              '🔔 [usePushNotifications] No service worker registration found yet, will check after registration'
            )
          }
        })
        .catch(error => {
          console.error(
            '🔔 [usePushNotifications] Error checking service worker registration:',
            error
          )
        })

      // Listen for service worker registration changes
      const handleSWChange = () => {
        console.log(
          '🔔 [usePushNotifications] Service worker change detected, checking subscription...'
        )
        checkSubscription()
      }

      navigator.serviceWorker.addEventListener('controllerchange', handleSWChange)

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleSWChange)
      }
    } else {
      console.log(
        '🔔 [usePushNotifications] Push notifications NOT supported, setting isSupported to false'
      )
      setIsSupported(false)
    }
  }, [checkSubscription])

  const subscribe = useCallback(async () => {
    try {
      console.log('🔔 [usePushNotifications] Starting subscribe process')
      console.log('🔔 [usePushNotifications] Current user:', window.location.pathname)

      // First, request permission
      const result = await Notification.requestPermission()
      console.log('🔔 [usePushNotifications] Permission result:', result)
      setPermission(result)

      if (result === 'granted') {
        console.log('🔔 [usePushNotifications] Permission granted, subscribing...')
        const subscription = await subscribeUserToPush()
        console.log('🔔 [usePushNotifications] Subscription result:', subscription)
        if (subscription) {
          setIsSubscribed(true)
          console.log('🔔 [usePushNotifications] Subscription successful')
          return true
        }
      }
      console.log('🔔 [usePushNotifications] Subscription failed or permission not granted')
      return false
    } catch (error: any) {
      console.error('🔔 [usePushNotifications] Error subscribing to push notifications:', error)

      // Handle specific error types
      if (error.name === 'AbortError' && error.message?.includes('push service error')) {
        console.error(
          '🔔 [usePushNotifications] Push service error - this usually means VAPID keys are invalid or mismatched'
        )
        alert(
          'Push notification service error. This could be due to invalid VAPID configuration. Please try refreshing the page or contact support.'
        )
      } else if (error.message?.includes('registration')) {
        console.log('🔔 [usePushNotifications] Attempting to clean up existing subscription...')
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager.getSubscription()
        await sub?.unsubscribe()
      }

      return false
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    try {
      await unsubscribeUserFromPush()
      setIsSubscribed(false)
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }, [])

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  }
}
