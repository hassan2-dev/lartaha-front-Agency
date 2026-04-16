export interface ApiError {
  message?: string
  response?: {
    data?: {
      message?: string
    }
  }
}

export const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
  const err = error as ApiError
  return err.response?.data?.message ?? err.message ?? defaultMessage
}
