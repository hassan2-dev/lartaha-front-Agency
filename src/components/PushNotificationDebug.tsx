import { useState, useEffect } from 'react'

export default function PushNotificationDebug() {
  const [debugInfo, setDebugInfo] = useState({
    serviceWorkerSupported: false,
    pushManagerSupported: false,
    notificationSupported: false,
    isHttps: false,
    serviceWorkerRegistered: false,
    serviceWorkerReady: false,
    currentPermission: 'default',
    subscriptionExists: false
  })

  useEffect(() => {
    const checkDebugInfo = async () => {
      const info = {
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushManagerSupported: 'PushManager' in window,
        notificationSupported: 'Notification' in window,
        isHttps: location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1',
        serviceWorkerRegistered: false,
        serviceWorkerReady: false,
        currentPermission: 'Notification' in window ? Notification.permission : 'not_supported',
        subscriptionExists: false
      }

      // Check service worker registration
      if (info.serviceWorkerSupported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          info.serviceWorkerRegistered = !!registration
          if (registration) {
            info.serviceWorkerReady = !!registration.active
            // Check subscription
            const subscription = await registration.pushManager.getSubscription()
            info.subscriptionExists = !!subscription
          }
        } catch (error) {
          console.error('Error checking service worker:', error)
        }
      }

      setDebugInfo(info)
    }

    checkDebugInfo()
    
    // Update every 2 seconds
    const interval = setInterval(checkDebugInfo, 2000)
    return () => clearInterval(interval)
  }, [])

  const isSupported = debugInfo.serviceWorkerSupported && debugInfo.pushManagerSupported && debugInfo.isHttps

  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px 0', 
      border: '1px solid #ddd', 
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      backgroundColor: '#f9f9f9'
    }}>
      <h4>Push Notification Debug Info</h4>
      <div style={{ color: isSupported ? 'green' : 'red' }}>
        <strong>Overall Support:</strong> {isSupported ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}
      </div>
      
      <div style={{ marginTop: '10px' }}>
        <div><strong>Service Worker API:</strong> {debugInfo.serviceWorkerSupported ? '✅' : '❌'}</div>
        <div><strong>PushManager API:</strong> {debugInfo.pushManagerSupported ? '✅' : '❌'}</div>
        <div><strong>Notification API:</strong> {debugInfo.notificationSupported ? '✅' : '❌'}</div>
        <div><strong>Secure Context (HTTPS/localhost):</strong> {debugInfo.isHttps ? '✅' : '❌'}</div>
        <div><strong>Service Worker Registered:</strong> {debugInfo.serviceWorkerRegistered ? '✅' : '❌'}</div>
        <div><strong>Service Worker Ready:</strong> {debugInfo.serviceWorkerReady ? '✅' : '❌'}</div>
        <div><strong>Current Permission:</strong> {debugInfo.currentPermission}</div>
        <div><strong>Subscription Exists:</strong> {debugInfo.subscriptionExists ? '✅' : '❌'}</div>
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
        This debug panel updates every 2 seconds
      </div>
    </div>
  )
}
