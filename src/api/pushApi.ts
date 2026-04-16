import { api } from './http'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const NORMALIZED_VAPID_PUBLIC_KEY = VAPID_PUBLIC_KEY?.trim() || ''

function validateVapidKey() {
  if (!NORMALIZED_VAPID_PUBLIC_KEY) {
    console.error('🔔 [pushApi] VAPID public key is missing from environment variables')
    return false
  }

  // VAPID public keys should be 87 characters (newer web-push versions) or 65 characters (older versions)
  const isValidLength =
    NORMALIZED_VAPID_PUBLIC_KEY.length === 87 || NORMALIZED_VAPID_PUBLIC_KEY.length === 65
  if (!isValidLength) {
    console.error(
      '🔔 [pushApi] VAPID public key appears to be invalid (wrong length):',
      NORMALIZED_VAPID_PUBLIC_KEY.length
    )
    console.error(
      '🔔 [pushApi] Expected 87 or 65 characters, got:',
      NORMALIZED_VAPID_PUBLIC_KEY.length
    )
    return false
  }

  console.log(
    '🔔 [pushApi] VAPID public key validation passed, length:',
    NORMALIZED_VAPID_PUBLIC_KEY.length
  )
  return true
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function areUint8ArraysEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

async function persistSubscription(subscription: PushSubscription) {
  await api.post('/api/push/subscribe', subscription.toJSON())
  console.log('🔔 [pushApi] Subscription sent to server successfully')
}

async function createFreshSubscription(
  registration: ServiceWorkerRegistration,
  applicationServerKey: BufferSource
) {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })
}

async function cleanupExistingSubscription(registration: ServiceWorkerRegistration) {
  const currentSubscription = await registration.pushManager.getSubscription()
  if (!currentSubscription) return

  try {
    await currentSubscription.unsubscribe()
    await api.delete('/api/push/unsubscribe', {
      data: { endpoint: currentSubscription.endpoint },
    })
    console.log('🔔 [pushApi] Existing subscription cleaned up')
  } catch (cleanupError) {
    console.warn('🔔 [pushApi] Failed to fully cleanup existing subscription:', cleanupError)
  }
}

async function resetPushRuntimeState() {
  console.warn('🔔 [pushApi] Resetting push runtime state (service workers + subscriptions)')
  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.allSettled(
    registrations.map(async registration => {
      try {
        const sub = await registration.pushManager.getSubscription()
        if (sub) {
          try {
            await sub.unsubscribe()
            await api.delete('/api/push/unsubscribe', {
              data: { endpoint: sub.endpoint },
            })
          } catch (unsubscribeError) {
            console.warn(
              '🔔 [pushApi] Failed cleanup while resetting registration:',
              unsubscribeError
            )
          }
        }
      } finally {
        await registration.unregister()
      }
    })
  )

  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export async function subscribeUserToPush() {
  console.log('🔔 [pushApi] Starting subscribeUserToPush')

  if (!validateVapidKey()) {
    throw new Error('VAPID public key is not configured or invalid on the client')
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('🔔 [pushApi] Push notifications are not supported by your browser')
    throw new Error('Push notifications are not supported by your browser')
  }

  const registration = await navigator.serviceWorker.ready
  console.log('🔔 [pushApi] Service worker ready:', registration.scope)
  const applicationServerKey = urlBase64ToUint8Array(NORMALIZED_VAPID_PUBLIC_KEY)

  console.log(
    '🔔 [pushApi] VAPID public key configured:',
    NORMALIZED_VAPID_PUBLIC_KEY.substring(0, 20) + '...'
  )

  const existingSubscription = await registration.pushManager.getSubscription()
  if (existingSubscription) {
    const existingKeyBuffer = existingSubscription.options.applicationServerKey
    const existingKey = existingKeyBuffer ? new Uint8Array(existingKeyBuffer) : null
    const keyMatches = existingKey ? areUint8ArraysEqual(existingKey, applicationServerKey) : false

    if (keyMatches) {
      console.log('🔔 [pushApi] Reusing existing subscription')
      await persistSubscription(existingSubscription)
      return existingSubscription
    }

    console.log('🔔 [pushApi] Existing subscription uses different VAPID key, cleaning up')
    await cleanupExistingSubscription(registration)
  }

  let subscription: PushSubscription
  try {
    subscription = await createFreshSubscription(registration, applicationServerKey)
  } catch (error: unknown) {
    const err = error as Error & { name?: string; message?: string }
    const isRecoverableError = err?.name === 'AbortError' || err?.name === 'InvalidStateError'

    if (!isRecoverableError) {
      throw error
    }

    console.warn(
      '🔔 [pushApi] Initial subscription failed, retrying after cleanup:',
      err?.message || error
    )
    await cleanupExistingSubscription(registration)

    try {
      subscription = await createFreshSubscription(registration, applicationServerKey)
    } catch (retryError: unknown) {
      const retryErr = retryError as Error & { name?: string; message?: string }
      const isStillRecoverable =
        retryErr?.name === 'AbortError' || retryErr?.name === 'InvalidStateError'

      if (!isStillRecoverable) {
        throw retryError
      }

      console.warn(
        '🔔 [pushApi] Retry after cleanup failed, performing hard SW reset:',
        retryError?.message || retryError
      )
      const resetRegistration = await resetPushRuntimeState()
      subscription = await createFreshSubscription(resetRegistration, applicationServerKey)
    }
  }

  console.log('🔔 [pushApi] Subscription created:', subscription.endpoint.substring(0, 50) + '...')

  try {
    await persistSubscription(subscription)
    return subscription
  } catch (error) {
    console.error('🔔 [pushApi] Failed to send subscription to server:', error)
    throw error
  }
}

export async function unsubscribeUserFromPush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await api.delete('/api/push/unsubscribe', { data: { endpoint } })
  }
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready
  return await registration.pushManager.getSubscription()
}
