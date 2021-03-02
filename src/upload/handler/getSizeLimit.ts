import config from 'config'
import { loggingFactory } from '../../logger'

const logger = loggingFactory('getSizeLimit.handler')
type GetSizeLimitRouteHandler = (req: any, res: any) => Promise<void>

export default function (): GetSizeLimitRouteHandler {
  return (_: any, res: any): Promise<void> => {
    logger.info('Retrieving file size limit')
    return res.json({
      fileSizeLimit: config.get<number>('fileSizeLimit')
    })
  }
}
