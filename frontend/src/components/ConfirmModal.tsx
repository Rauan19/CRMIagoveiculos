interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  confirmColor?: 'red' | 'blue' | 'green' | 'yellow'
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Sim',
  cancelText = 'Não',
  confirmColor = 'red'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const confirmButtonColors: Record<string, string> = {
    red: 'bg-red-600 hover:bg-red-700 text-white',
    blue: 'bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-600',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-primary-700 border border-yellow-300',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg transition-colors ${confirmButtonColors[confirmColor]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}






