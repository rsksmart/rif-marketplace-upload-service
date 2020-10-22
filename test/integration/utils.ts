import config from 'config'
import { promises as fs } from 'fs'
import path from 'path'
import { reset as resetStore } from 'sequelize-store'
import { Sequelize } from 'sequelize'
import feathers from '@feathersjs/feathers'
import socketio from '@feathersjs/socketio-client'
import io from 'socket.io-client'
import PeerId from 'peer-id'

import { loggingFactory } from '../../src/logger'
import { appFactory, services } from '../../src/app'
import { sequelizeFactory } from '../../src/sequelize'
import { Application, SupportedServices } from '../../src/definitions'

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

    // Precache
    await this.precache()
    this.logger.info('Database precached')
  }

  async precache () {
    for (const service of Object.values(SupportedServices).filter(service => config.get(`${service}.enabled`))) {
      await services[service].precache()
    }
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
    resetStore()

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

export function getFeatherClient () {
  const socket = io(`http://localhost:${config.get('port')}`)
  const app = feathers()

  // Set up Socket.io client with the socket
  app.configure(socketio(socket))

  return app
}
