import fs from 'fs'
import path from 'path'
import Libp2p from 'libp2p'

import { subscribeForOffer } from '../communication'
import { UploadJobStatus } from '../definitions'
import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'
import UploadJob from './upload.model'

const logger = loggingFactory('upload.handler')
type UploadRouteHandler = (req: any, res: any) => Promise<void>

async function unlinkFiles (files: any[]): Promise<void> {
  for (const file of files) {
    await fs.promises.unlink(file.path)
    logger.info(`File ${file.filename} removed from fs`)
  }
}

export default function (storageProvider: ProviderManager, libp2p: Libp2p): UploadRouteHandler {
  return async (req: any, res: any): Promise<void> => {
    const { offerId, peerId, account, contractAddress } = req.body
    const missedParams = ['offerId', 'peerId', 'account', 'contractAddress'].filter(k => !req.body[k])

    if (missedParams.length) {
      return res.status(422).json({
        error: `Params ${missedParams} required`
      })
    }

    if (!req.files || !req.files.length) {
      return res.status(422).json({
        error: 'File needs to be provided.'
      })
    }

    logger.info(`Receive files ${req.files.map((f: any) => f.filename)} for offer ${offerId}, peerId ${peerId}`)

    // Create upload job
    const job = await UploadJob.create({
      offerId: offerId.toLowerCase(),
      peerId,
      account,
      contractAddress: contractAddress.toLowerCase(),
      meta: { files: req.files.map((f: any) => f.originalname) },
      status: UploadJobStatus.UPLOADING
    })
    logger.info('Job created')

    // Read files from fs and start uploading to storage
    const files = req.files.map((file: any) => {
      return {
        path: path.resolve('/', file.filename),
        content: fs.createReadStream(file.path)
      }
    })
    const { cid } = await storageProvider.add(files, { wrapWithDirectory: true })
    logger.info(`Files uploaded to IPFS, file hash ${cid.toString()}`)
    // Unlink files from fs
    await unlinkFiles(req.files)

    // Update job
    job.fileHash = `/ipfs/${cid.toString()}`
    job.status = UploadJobStatus.WAITING_FOR_PINNING
    await job.save()

    // Get file size
    const fileSize = await storageProvider.getMetaFileSize(job.fileHash)

    // Register room
    await subscribeForOffer(libp2p, storageProvider, offerId.toLowerCase(), peerId, contractAddress.toLowerCase())

    return res.json({
      message: 'Files uploaded',
      fileHash: cid.toString(),
      fileSize
    })
  }
}
