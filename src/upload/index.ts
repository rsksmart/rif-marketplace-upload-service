import * as fs from 'fs'
import path from 'path'

import { Application, UploadService, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import { errorHandler, waitForReadyApp } from '../utils'
import UploadJob from './model/upload.model'
import uploadHandler, { UPLOAD_FOLDER } from './handler/upload.handler'
import getFileSizeHandler from './handler/getFileSize.handler'
import getSizeLimitHandler from './handler/getSizeLimit.handler'

const logger = loggingFactory('upload-service')

const upload: UploadService = {
  async initialize (app: Application): Promise<{ stop: () => Promise<void> }> {
    await waitForReadyApp(app)

    const libp2p = app.get('libp2p')
    const providerManager = app.get('storage')

    // Create folder for upload files
    const uploadFolderPath = path.resolve(process.cwd(), UPLOAD_FOLDER)

    if (!fs.existsSync(uploadFolderPath)) {
      fs.mkdirSync(uploadFolderPath)
    }

    // Init upload route
    app.post(
      ServiceAddresses.Upload,
      // uploadMiddleware.array('files'),
      errorHandler(uploadHandler(providerManager, libp2p), logger)
    )

    // Init get file size route
    app.get(
      ServiceAddresses.FileSize,
      errorHandler(getFileSizeHandler(providerManager), logger)
    )

    app.get(
      ServiceAddresses.FileSizeLimit,
      errorHandler(getSizeLimitHandler(), logger)
    )

    return {
      stop: () => Promise.resolve()
    }
  },

  async purge (): Promise<void> {
    const count = await UploadJob.destroy({ where: {} })
    logger.info(`Removed ${count} upload job entries`)
  },

  precache (): Promise<void> {
    return Promise.resolve()
  }
}

export default upload
