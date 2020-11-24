import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'

const logger = loggingFactory('getFileSize.handler')
type GetFileSizeRouteHandler = (req: any, res: any) => Promise<void>

export default function (storageProvider: ProviderManager): GetFileSizeRouteHandler {
  return async (req: any, res: any): Promise<void> => {
    const { hash } = req.params
    const missedParams = ['hash'].filter(k => !req.params[k])

    if (missedParams.length) {
      return res.status(422).json({
        error: `Params ${missedParams} required`
      })
    }

    logger.info(`Retrieving file size for hash ${hash}`)
    return res.json({
      fileHash: hash,
      fileSizeBytes: await storageProvider.getFileSize(hash)
    })
  }
}
