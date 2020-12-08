import { createLibP2P, Message, Room } from '@rsksmart/rif-communications-pubsub'
import Libp2p from 'libp2p'
import config from 'config'
import parse from 'parse-duration'
import PeerId from 'peer-id'

import { messageHandler } from './handler'
import { Application, CommsMessage, CommsPayloads, Logger } from '../definitions'
import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'
import { errorHandler } from '../utils'

const logger = loggingFactory('communication')

// (offerId -> room) MAP
export const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string, contractAddress: string): string {
  return `${config.get<number>('networkId')}:${contractAddress.toLowerCase()}:${offerId.toLowerCase()}`
}

export function leaveRoom (topic: string): void {
    rooms.get(topic)?.leave()
    rooms.delete(topic)
}

export function getOrCreateRoom (topic: string, libp2p: Libp2p, roomLogger: Logger): Room {
  if (rooms.has(topic)) {
    return rooms.get(topic) as Room
  }
  const room = new Room(libp2p, topic)
  rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated
  roomLogger.info(`Created room for topic: ${topic}`)
  return room
}

export function subscribeForOffer (
  libp2p: Libp2p,
  storageProvider: ProviderManager,
  offerId: string,
  peerId: string,
  contractAddress: string
): void {
  if (!libp2p) {
    throw new Error('Libp2p not initialized')
  }
  const topic = getRoomTopic(offerId, contractAddress)
  const roomLogger = loggingFactory(`communication:room:${topic}`)
  const room = getOrCreateRoom(topic, libp2p, roomLogger)
  const handler = errorHandler(messageHandler(offerId, contractAddress, storageProvider, roomLogger), roomLogger)

  const unsubscribe = room.on('message', async ({ from, data: message }: Message<any>) => {
    // Ignore message from itself
    if (from === (libp2p as Libp2p).peerId.toJSON().id) {
      return
    }

    roomLogger.debug(`Receive message: ${JSON.stringify(message)}`)

    if (from !== peerId) {
      return
    }

    if (await handler(message as CommsMessage<CommsPayloads>)) {
      // If handler returns true, than it signals no further messages are expected
      // and we remove this handler.
      logger.debug('Unsubscribe from room `onMessage` handler')
      unsubscribe()
    }
  })
  room.on('peer:joined', (peer) => roomLogger.debug(`${topic}: peer ${peer} joined`))
  room.on('peer:left', (peer) => roomLogger.debug(`${topic}: peer ${peer} left`))
  room.on('error', (e) => roomLogger.error(e))
  setTimeout(unsubscribe, parse(config.get<string>('gc.jobTtl')) as number)
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
