import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'

const logger = loggingFactory('getFileSize.handler')
type GetFileSizeRouteHandler = (req: any, res: any) => Promise<void>

export default function (storageProvider: ProviderManager): GetFileSizeRouteHandler {
  return async (req: any, res: any): Promise<void> => {
    const { hash } = req.query
    const missedParams = ['hash'].filter(k => !req.query[k])

    if (missedParams.length) {
      return res.status(422).json({
        error: `Params ${missedParams} required`
      })
    }

    logger.info(`Retrieving file size for hash ${hash}`)
    try {
      return res.json({
        fileHash: hash,
        fileSizeBytes: await storageProvider.getActualFileSize(hash)
      })
    } catch (e) {
      res.status(500).json({
        message: e.message,
        name: 'GET_FILE_SIZE_ERROR'
      })
    }
  }
}
