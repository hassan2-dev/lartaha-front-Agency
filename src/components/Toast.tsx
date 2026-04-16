import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'error', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const styles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-l-4 border-red-400 dark:border-red-500',
      text: 'text-red-800 dark:text-red-200',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-l-4 border-green-400 dark:border-green-500',
      text: 'text-green-800 dark:text-green-200',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-l-4 border-blue-400 dark:border-blue-500',
      text: 'text-blue-800 dark:text-blue-200',
    },
  }[type]

  return (
    <div className="fixed top-4 left-4 z-[9999] animate-slide-in">
      <div
        className={`${styles.bg} ${styles.border} ${styles.text} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]`}
      >
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className={`p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors ${styles.text}`}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
