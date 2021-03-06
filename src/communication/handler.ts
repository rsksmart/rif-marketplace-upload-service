import { getRoomTopic, leaveRoom } from './index'
import {
  CommsMessage,
  CommsPayloads,
  HashInfoPayload, Logger,
  MessageCodesEnum
} from '../definitions'
import { ProviderManager } from '../providers'
import UploadJob from '../upload/model/upload.model'

async function hashPinnedHandler (
  offerId: string,
  contractAddress: string,
  message: CommsMessage<HashInfoPayload>,
  storageProvider: ProviderManager,
  roomLogger: Logger
): Promise<void> {
  const fileHash = `/ipfs/${message.payload.hash}`
  const job = await UploadJob.findOne(
    {
      where: {
        fileHash,
        offerId,
        contractAddress
      }
    }
  )

  if (!job) {
    roomLogger.debug(`Job for file ${message.payload.hash} not found`)
    return
  }

  await job.destroy()

  // Unpin file if not active jobs for that hash
  const pendingJobsForHash = await UploadJob.count({ where: { fileHash } })

  if (!pendingJobsForHash) {
    await storageProvider?.rm(job.fileHash).catch(e => {
      if (e.code === 'NOT_PINNED_ERR') {
        return
      }
      throw e
    })
    roomLogger.info(`File ${job.fileHash} for offer ${job.offerId} unpinned`)
  }

  // Leave room if not active jobs for that offer
  const pendingJobsForOffer = await UploadJob.count({ where: { offerId, contractAddress } })

  if (!pendingJobsForOffer) {
    roomLogger.info('Leaving room')
    leaveRoom(getRoomTopic(offerId, contractAddress))
  }
}

export function messageHandler (
  offerId: string,
  contractAddress: string,
  storageProvider: ProviderManager,
  roomLogger: Logger
): (message: CommsMessage<CommsPayloads>) => Promise<boolean> {
  return async function (message: CommsMessage<CommsPayloads>): Promise<boolean> {
    switch (message.code) {
      case MessageCodesEnum.I_HASH_PINNED:
        await hashPinnedHandler(offerId, contractAddress, message as CommsMessage<HashInfoPayload>, storageProvider, roomLogger)
        return true
      default:
        return false
    }
  }
}
