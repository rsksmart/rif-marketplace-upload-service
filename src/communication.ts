import config from 'config'
import { createLibP2P, Room, Message } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'
import PeerId from 'peer-id'

import { loggingFactory } from './logger'
import {
  Application,
  CommsMessage,
  CommsPayloads,
  MessageHandler
} from './definitions'
import UploadJob from './services/upload/upload.model'
import { errorHandler } from './utils'

const logger = loggingFactory('communication')
// (offerId -> room) MAP
const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

export function messageHandler (
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
  return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
    const job = await UploadJob.findOne({ where: { agreementReference: message.payload.agreementReference } })

    if (!job) {
      logger.verbose(`Job for agreement ${message.payload.agreementReference} not found`)
      return
    }
  }
}

export async function initLibp2p (): Promise<Libp2p> {
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')
  return createLibP2P({ ...libp2pConf, peerId: await PeerId.create() })
}

export class Comms {
  public libp2p: Libp2p | undefined
  private _messageHandler: MessageHandler = messageHandler()

  set messageHandler (handler: MessageHandler) {
    this._messageHandler = handler
  }

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

  async init (): Promise<void> {
    if (this.libp2p) {
      throw new Error('libp2p node already spawned')
    }
    this.libp2p = await initLibp2p()
  }

  subscribeForOffer (offerId: string, offerPeerId: string): void {
    if (!this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    const topic = getRoomTopic(offerId)

    if (rooms.has(topic)) {
      rooms.get(topic)?.leave()
    }
    const roomLogger = loggingFactory(`communication:room:${topic}`)
    const messageHandler = errorHandler(this._messageHandler, roomLogger)
    const room = new Room(this.libp2p, topic)
    rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated
    roomLogger.info(`Created room for topic: ${topic}`)

    room.on('message', async ({ from, data: message }: Message<any>) => {
      // Ignore message from itself
      if (from === this.libp2p?.peerId.toJSON().id) {
        return
      }

      roomLogger.debug(`Receive message: ${JSON.stringify(message)}`)

      if (from !== offerPeerId) {
        return
      }
      await messageHandler(message as CommsMessage<CommsPayloads>)
    })
    room.on('peer:joined', (peer) => roomLogger.debug(`${topic}: peer ${peer} joined`))
    room.on('peer:left', (peer) => roomLogger.debug(`${topic}: peer ${peer} left`))
    room.on('error', (e) => roomLogger.error(e))
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
