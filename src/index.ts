import config from 'config'

import { appFactory } from './app'
import { loggingFactory } from './logger'

(async function (): Promise<void> {
  const logger = loggingFactory()
  const { app } = await appFactory()
  // Start server
  const port = config.get('port')
  const server = app.listen(port)

  server.on('listening', () =>
    logger.info(`Server started on port ${port}`)
  )

  process.on('unhandledRejection', err =>
    logger.error(`Unhandled Rejection at: ${err}`)
  )
})()
