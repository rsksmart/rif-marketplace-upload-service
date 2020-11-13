import config from 'config'
import { flags } from '@oclif/command'

import { appFactory } from '../app'
import { loggingFactory } from '../logger'
import { Flags, Config } from '../definitions'
import { BaseCLICommand } from '../utils'

const logger = loggingFactory('cli:start')

export default class StartServer extends BaseCLICommand {
  static get description () {
    return 'Start upload server'
  }

  static examples = ['$ rif-marketplace-upload-service start']

  static flags = {
    ...BaseCLICommand.flags,
    port: flags.integer({ char: 'p', description: 'port to attach the server to' }),
    db: flags.string({ description: 'database connection URI', env: 'RIFM_DB' })
  }

  private buildConfigObject (flags: Flags<typeof StartServer>): object {
    const output: Config = {}

    if (flags.db) {
      output.db = flags.db
    }

    if (flags.port) {
      output.port = flags.port
    }

    return output
  }

  // eslint-disable-next-line require-await
  async run (): Promise<void> {
    const { flags } = this.parse(StartServer)

    const configOverrides = this.buildConfigObject(flags)
    config.util.extendDeep(config, configOverrides)

    appFactory().then(({ app }) => {
      // Start server
      const port = config.get('port')
      const server = app.listen(port)

      server.on('listening', () =>
        logger.info(`Server started on port ${port}`)
      )

      process.on('unhandledRejection', err =>
        logger.error(`Unhandled Rejection at: ${err}`)
      )
    })
  }
}
