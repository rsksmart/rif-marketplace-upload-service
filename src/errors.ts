/**
 * Error for problems related to providers
 */
export class ProviderError extends Error {
  static code = 'PROVIDER_ERR'
  public code: string

  constructor (message: string) {
    super(message)
    this.name = 'ProviderError'
    this.code = ProviderError.code
  }
}

export class NotPinnedError extends ProviderError {
  static code = 'NOT_PINNED_ERR'
  public code: string

  constructor (message: string) {
    super(message)
    this.name = 'NotPinnedError'
    this.code = NotPinnedError.code
  }
}

