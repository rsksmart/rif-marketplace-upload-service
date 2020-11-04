import { createLibP2P, Message, Room } from '@rsksmart/rif-communications-pubsub'
import Libp2p from 'libp2p'
import config from 'config'
import PeerId from 'peer-id'

import { messageHandler } from './handler'
import { Application, CommsMessage, CommsPayloads } from '../definitions'
import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'
import { errorHandler } from '../utils'

const logger = loggingFactory('communication')

// (offerId -> room) MAP
export const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string): string {
  return `${config.get<number>('networkId')}:${offerId}`
}

export function leaveRoom (topic: string): void {
    rooms.get(topic)?.leave()
    rooms.delete(topic)
}

export function subscribeForOffer (
  libp2p: Libp2p,
  storageProvider: ProviderManager,
  offerId: string,
  peerId: string
): void {
  if (!libp2p) {
    throw new Error('Libp2p not initialized')
  }
  const topic = getRoomTopic(offerId)

  // Do not create another rom\om for the same offer
  if (rooms.has(topic)) {
    return
  }

  const roomLogger = loggingFactory(`communication:room:${topic}`)
  const handler = errorHandler(messageHandler(offerId, storageProvider, roomLogger), roomLogger)
  const room = new Room(libp2p, topic)
  rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated
  roomLogger.info(`Created room for topic: ${topic}`)

  room.on('message', async ({ from, data: message }: Message<any>) => {
    // Ignore message from itself
    if (from === (libp2p as Libp2p).peerId.toJSON().id) {
      return
    }

    roomLogger.debug(`Receive message: ${JSON.stringify(message)}`)

    if (from !== peerId) {
      return
    }

    await handler(message as CommsMessage<CommsPayloads>)
  })
  room.on('peer:joined', (peer) => roomLogger.debug(`${topic}: peer ${peer} joined`))
  room.on('peer:left', (peer) => roomLogger.debug(`${topic}: peer ${peer} left`))
  room.on('error', (e) => roomLogger.error(e))
}

export async function initLibp2p (): Promise<Libp2p> {
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')
  return createLibP2P({ ...libp2pConf, peerId: await PeerId.create() })
}

export async function initComms (app: Application): Promise<void> {
  if (app.get('libp2p')) {
    throw new Error('Libp2p node already spawned')
  }
  const libp2p = await initLibp2p()
  app.set('libp2p', libp2p)
}

export async function stopComms (libp2p: Libp2p): Promise<void> {
  for (const [topic] of rooms) {
    leaveRoom(topic)
  }

  await libp2p.stop()
}

export default function (app: Application): void {
  app.set('initComms', initComms(app))
}
