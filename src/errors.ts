
/**
 * Error for problems during processing of received events
 */
export class EventError extends Error {
  static code = 'EVENT_ERR'

  constructor (message: string, event?: string) {
    if (event) {
      message = `During processing event ${event}: ${message}`
    }

    super(message)
    this.name = 'EventError'
  }
}

/**
 * Error for configuration related issues
 */
export class ConfigurationError extends Error {
  static code = 'CONFIG_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Error for when fetching new rates does not go as planned
 */
export class RatesProviderError extends Error {
  static code = 'RATES_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'RatesProviderError'
  }
}

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

