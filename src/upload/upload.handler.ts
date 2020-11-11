import fs from 'fs'
import Libp2p from 'libp2p'
import { subscribeForOffer } from '../communication'
import { UploadJobStatus } from '../definitions'
import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'
import UploadJob from './upload.model'

const logger = loggingFactory('upload.handler')
type UploadRouteHandler = (req: any, res: any) => Promise<void>

export default function (storageProvider: ProviderManager, libp2p: Libp2p): UploadRouteHandler {
  return async (req: any, res: any): Promise<void> => {
    const { offerId, peerId, account } = req.body
    const missedParams = ['offerId', 'peerId', 'account'].filter(k => req.body[k])

    if (!missedParams.length) {
      return res.status(422).json({
        error: `Params ${missedParams} required`
      })
    }

    if (!req.file) {
      return res.status(422).json({
        error: 'File needs to be provided.'
      })
    }

    logger.info(`Receive file ${req.file.filename} for offer ${offerId}, peerId ${peerId}`)

    // Create upload job
    const job = await UploadJob.create({
      offerId,
      peerId,
      account,
      meta: { filename: req.file.originalname },
      status: UploadJobStatus.UPLOADING
    })
    logger.info('Job created')

    // Read file from fs and start uploading to storage
    const data = await fs.promises.readFile(req.file.path)
    const { cid } = await storageProvider.add(data)
    logger.info(`File ${req.file.filename} uploaded to IPFS, file hash ${cid.toString()}`)

    // Unlink file from fs
    await fs.promises.unlink(req.file.path)
    logger.info(`File ${req.file.filename} removed from fs`)

    // Update job
    job.fileHash = `/ipfs/${cid.toString()}`
    job.status = UploadJobStatus.WAITING_FOR_PINNING
    await job.save()

    // Register room
    await subscribeForOffer(libp2p, storageProvider, offerId, peerId)

    return res.json({
      message: 'File uploaded',
      fileHash: cid.toString()
    })
  }
}
