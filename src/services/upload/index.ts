import config from 'config'
import * as fs from 'fs'
import multer from 'multer'
import path from "path"

import { Application, UploadService, ServiceAddresses } from '../../definitions'
import { loggingFactory } from '../../logger'
import { duplicateObject, errorHandler, waitForReadyApp } from '../../utils'
import { ProviderManager } from './providers'
import { IpfsProvider } from './providers/ipfs'
import UploadJob from './upload.model'
import uploadHandler from './upload.handler'
import {
  Comms
} from '../../communication'
import { sleep } from '../../../test/utils'

const UPLOAD = 'upload'
const UPLOAD_FOLDER = 'uploads'
const logger = loggingFactory(UPLOAD)

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(process.cwd(), UPLOAD_FOLDER))
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}.${file.mimetype.split('/')[1]}`)
  },
})

const uploadMiddleware = multer({ storage })

const upload: UploadService = {
  async initialize (app: Application): Promise<{ stop: () => Promise<void> }> {
    if (!config.get<boolean>(`${UPLOAD}.enabled`)) {
      logger.info('Upload service: disabled')
      return { stop: () => Promise.resolve() }
    }
    logger.info('Upload service: enabled')

    await waitForReadyApp(app)

    // Initialize Provider Manager
    const providerManager = new ProviderManager()
    const ipfs = await IpfsProvider.bootstrap(duplicateObject(config.get<string>('ipfs.clientOptions')))
    providerManager.register(ipfs)
    logger.info('IPFS provider initialized')

    // Init comms
    const comms = app.get('comms') as Comms
    await comms.init(providerManager)

    // Create folder for upload files
    const uploadFolderPath = path.resolve(process.cwd(), UPLOAD_FOLDER)
    if (!fs.existsSync(uploadFolderPath)) {
      fs.mkdirSync(uploadFolderPath)
    }

    // Init upload route
    app.post(
        ServiceAddresses.Upload,
        uploadMiddleware.single('file'),
        errorHandler(uploadHandler(providerManager, comms), logger)
    )

    return {
      stop: async () => {
        await comms.stop()
      }
    }
  },

  async purge (): Promise<void> {
    const count = await UploadJob.destroy({ where: {} })
    logger.info(`Removed ${count} upload job entries`)

    await sleep(1000)
  },

  precache (): Promise<void> {
    return Promise.resolve()
  }
}

export default upload
