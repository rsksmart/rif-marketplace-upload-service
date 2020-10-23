import config from 'config'
import { createLibP2P, Room, Message } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'
import PeerId from 'peer-id'
import { Op } from 'sequelize'

import { loggingFactory } from './logger'
import {
  Application,
  CommsMessage,
  CommsPayloads,
  MessageCodesEnum,
  UploadJobStatus
} from './definitions'
import { ProviderManager } from './services/upload/providers'
import UploadJob from './services/upload/upload.model'
import { errorHandler } from './utils'

const logger = loggingFactory('communication')
// (offerId -> room) MAP
const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

export async function initLibp2p (): Promise<Libp2p> {
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')
  return createLibP2P({ ...libp2pConf, peerId: await PeerId.create() })
}

export class Comms {
  private libp2p: Libp2p | undefined
  private storageProvider: ProviderManager | undefined

  get peerId (): string {
    if (!this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    return this?.libp2p?.peerId.toJSON().id as string
  }

  get rooms (): Map<string, Room> {
    return rooms
  }

  getRoom (topic: string): Room | undefined {
    return rooms.get(topic)
  }

  async init (storageProvider: ProviderManager): Promise<void> {
    if (this.libp2p) {
      throw new Error('libp2p node already spawned')
    }
    this.libp2p = await initLibp2p()
    this.storageProvider = storageProvider
  }

  subscribeForOffer (job: UploadJob): void {
    if (!this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    const topic = getRoomTopic(job.offerId)

    if (rooms.has(topic)) {
      rooms.get(topic)?.leave()
    }
    const roomLogger = loggingFactory(`communication:room:${topic}`)
    const handler = errorHandler(this.messageHandler(job), roomLogger)
    const room = new Room(this.libp2p, topic)
    rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated
    roomLogger.info(`Created room for topic: ${topic}`)

    room.on('message', async ({ from, data: message }: Message<any>) => {
      // Ignore message from itself
      if (from === this.libp2p?.peerId.toJSON().id) {
        return
      }

      roomLogger.debug(`Receive message: ${JSON.stringify(message)}`)

      if (from !== job.peerId) {
        return
      }
      await handler(message as CommsMessage<CommsPayloads>)
    })
    room.on('peer:joined', (peer) => roomLogger.debug(`${topic}: peer ${peer} joined`))
    room.on('peer:left', (peer) => roomLogger.debug(`${topic}: peer ${peer} left`))
    room.on('error', (e) => roomLogger.error(e))
  }

  messageHandler (
      job: UploadJob
  ): (message: CommsMessage<CommsPayloads>) => Promise<void> {
    return async function (this: Comms, message: CommsMessage<CommsPayloads>): Promise<void> {
      if (!job) {
        logger.verbose(`Job for agreement ${message.payload.agreementReference} not found`)
        return
      }

      if (message.code === MessageCodesEnum.I_HASH_PINNED) {
        job.status = UploadJobStatus.PINNED
        await job.save()
        this.getRoom(getRoomTopic(job.offerId))?.leave()

        const jobs = await UploadJob.findAll({ where: { fileHash: job.fileHash, status: { [Op.ne]: UploadJobStatus.PINNED } } })
        // Unpin files if no jobs for that hash
        if (!jobs.length) {
          await this.storageProvider?.rm(job.fileHash)
        }
      }
    }
  }


  async stop (): Promise<void> {
    for (const [, room] of this.rooms) {
      room.leave()
    }

    if (this.libp2p) {
      await this.libp2p.stop()
    }
  }
}

export default function (app: Application): void {
  app.set('comms', new Comms())
}
