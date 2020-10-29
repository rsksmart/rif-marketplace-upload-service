import config from 'config'
import { promises as fs } from 'fs'
import path from 'path'
import { Sequelize } from 'sequelize'
import PeerId from 'peer-id'

import { loggingFactory } from '../../src/logger'
import { appFactory } from '../../src/app'
import { sequelizeFactory } from '../../src/sequelize'
import { Application } from '../../src/definitions'

export class TestingApp {
  private readonly logger = loggingFactory('test:test-app')
  private app: { stop: () => void, app: Application } | undefined
  public sequelize: Sequelize | undefined
  public peerId: PeerId.JSONPeerId | undefined

  async initAndStart (options?: any, force = false): Promise<void> {
    if (this.app && !force) {
      return
    }
    await this.init()
    this.logger.info('App initialized')
    await this.start(options)
    this.logger.info('App started')
  }

  async init (): Promise<void> {
    this.peerId = (await PeerId.create()).toJSON()

    await this.purgeDb()
    this.logger.info('Database removed')
    // Init DB
    const sequelize = await sequelizeFactory()
    await sequelize.sync({ force: true })
    this.logger.info('Database initialized')
  }

  async start (options?: Partial<any>): Promise<void> {
    // Run Upload service
    this.app = await appFactory()

    // Start server
    const port = config.get('port')
    const server = this.app.app.listen(port)
    this.logger.info('Cache service started')

    server.on('listening', () =>
      this.logger.info(`Server started on port ${port}`)
    )

    process.on('unhandledRejection', err =>
      this.logger.error(`Unhandled Rejection at: ${err}`)
    )
  }

  async stop (): Promise<void> {
    if (this.app) {
      this.app.stop()
    }

    await this.sequelize?.close()

    this.sequelize = undefined
    this.app = undefined
  }

  private async purgeDb (): Promise<void> {
    try {
      await fs
        .unlink(path.join(process.cwd(), config.get<string>('db')))
    } catch (e) {
      // File does not exist
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
  }
}
