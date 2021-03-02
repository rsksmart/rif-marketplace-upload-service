import Libp2p from 'libp2p'

import { subscribeForOffer } from '../../../communication'
import { loggingFactory } from '../../../logger'
import { ProviderManager } from '../../../providers'
import {
  fileUploader,
  getUploadMiddleware,
  increaseClientUploadCounter,
  isClientAllowedToUpload,
  isEnoughSpace,
  unlinkFiles
} from './utils'

export const UPLOAD_FOLDER = 'uploads'

const logger = loggingFactory('upload:handler')

type UploadRouteHandler = (req: any, res: any) => Promise<void>

export default function (storageProvider: ProviderManager, libp2p: Libp2p): UploadRouteHandler {
  const uploadFile = fileUploader(storageProvider, logger)
  const uploadMiddleware = getUploadMiddleware(UPLOAD_FOLDER, 'files')

  return async (req: any, res: any): Promise<void> => {
    // Check if this IP is not DDOS
    if (!await isClientAllowedToUpload(req)) {
      return res.status(400).json({
        error: 'Not allowed'
      })
    }

    // Check if enough space on machine
    if (!await isEnoughSpace()) {
      return res.status(400).json({
        error: 'Not allowed'
      })
    }

    uploadMiddleware(req, res, async (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(422).json({
            error: 'File too large'
          })
        }
        // Unexpected upload error
        logger.error(err)
        return res.status(500).json({ error: 'Internal error' })
      }

      const { offerId, peerId, contractAddress } = req.body
      const missedParams = ['offerId', 'peerId', 'account', 'contractAddress'].filter(k => !req.body[k])

      if (missedParams.length) {
        await unlinkFiles(req.files)

        return res.status(422).json({
          error: `Params ${missedParams} required`
        })
      }

      if (!req.files || !req.files.length) {
        return res.status(422).json({
          error: 'File needs to be provided.'
        })
      }

      // Increase Client upload counter
      await increaseClientUploadCounter(req)

      // Upload file to IPFS and create job
      const { fileSize, cid } = await uploadFile(req)

      // Register room
      await subscribeForOffer(libp2p, storageProvider, offerId.toLowerCase(), peerId, contractAddress.toLowerCase())

      return res.json({
        message: 'Files uploaded',
        fileHash: cid.toString(),
        fileSize
      })
    })
  }
}
