import config from 'config'
import { promises as fs } from 'fs'
import { Server } from 'http'
import { CID, IpfsClient } from 'ipfs-http-client'
import path from 'path'
import { Sequelize } from 'sequelize'
import PeerId from 'peer-id'

import { loggingFactory } from '../../src/logger'
import { appFactory } from '../../src/app'
import { sequelizeFactory } from '../../src/sequelize'
import { Application } from '../../src/definitions'
import { sleep } from '../utils'

export class TestingApp {
  private readonly logger = loggingFactory('test:test-app')
  public sequelize: Sequelize | undefined
  public server: undefined | Server
  public app: { stop: () => void, app: Application } | undefined
  public peerId: PeerId.JSONPeerId | undefined
  public providerAddress = '0xiopqndsaProviderAddress'

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
    // Purge DB
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
    this.server = this.app.app.listen(port)
    this.logger.info('Cache service started')

    this.server.on('listening', () =>
      this.logger.info(`Server started on port ${port}`)
    )

    process.on('unhandledRejection', err =>
      this.logger.error(`Unhandled Rejection at: ${err}`)
    )
  }

  async stop (): Promise<void> {
    if (this.app) {
      await this.app.stop()
    }

    this.server?.close()

    this.sequelize = undefined
    this.app = undefined
    await sleep(1000)
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

export async function asyncIterableToArray (asyncIterable: any): Promise<Array<any>> {
  const result = []
  for await (const value of asyncIterable) {
    result.push(value)
  }
  return result
}

export async function isPinned (ipfs: IpfsClient, cid: CID): Promise<boolean> {
  try {
    const [file] = await asyncIterableToArray(ipfs.pin.ls({ paths: cid }))
    return file.cid.toString() === cid.toString()
  } catch (e) {
    if (e.message === `path '${cid}' is not pinned`) return false
    throw e
  }
}
