import fs from 'fs'
import path from 'path'
import PeerId from 'peer-id'
import Libp2p from 'libp2p'
import { createLibP2P, Message, Room } from '@rsksmart/rif-communications-pubsub'

import { getRoomTopic } from '../src/communication'
import { loggingFactory } from '../src/logger'

export function sleep<T> (ms: number, ...args: T[]): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(...args), ms))
}

export function rmDir (folder: string): void {
  if (fs.existsSync(folder)) {
    for (const file of fs.readdirSync(folder)) {
      fs.unlinkSync(path.join(folder, file))
    }

    fs.rmdirSync(folder, { recursive: true })
  }
}

/**
 * Spawn libp2p node
 * @param peerId
 */
export function spawnLibp2p (peerId: PeerId): Promise<Libp2p> {
  return createLibP2P({
    addresses: { listen: ['/ip4/127.0.0.1/tcp/0'] },
    peerId: peerId,
    config: {
      peerDiscovery: {
        bootstrap: {
          enabled: false
        }
      }
    }
  })
}

/**
 * Create libp2p room for specific offer id
 * @param libp2p
 * @param offerId
 */
export function createLibp2pRoom (libp2p: Libp2p, offerId: string): Room {
  const roomName = getRoomTopic(offerId)
  const logger = loggingFactory(`test:comms:room:${roomName}`)
  logger.info(`Listening on room ${roomName}`)

  const roomPinner = new Room(libp2p, roomName, { pollInterval: 100 })

  roomPinner.on('peer:joined', (peer) => logger.debug(`${roomName}: peer ${peer} joined`))
  roomPinner.on('peer:left', (peer) => logger.debug(`${roomName}: peer ${peer} left`))
  roomPinner.on('message', (msg: Message) => {
    if (msg.from === libp2p.peerId.toJSON().id) return
    logger.info(`Receive message: ${JSON.stringify(msg.data)}`)
  })
  roomPinner.on('error', (e) => logger.error(e))
  return roomPinner
}

/**
 * Await for peer joined
 * @param room
 */
export function awaitForPeerJoined (room: Room): Promise<void> {
  return new Promise(resolve => {
    room.on('peer:joined', () => {
      resolve()
    })
  })
}
