import * as fs from 'fs'
import multer from 'multer'
import path from 'path'
import config from 'config'

import { Application, UploadService, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import { errorHandler, waitForReadyApp } from '../utils'
import UploadJob from './upload.model'
import uploadHandler from './upload.handler'
import getFileSizeHandler from './getFileSize.handler'

export const UPLOAD_FOLDER = 'uploads'
const logger = loggingFactory('upload-service')

const storage = multer.diskStorage({
  destination (req, file, cb) {
    cb(null, path.join(process.cwd(), UPLOAD_FOLDER))
  },
  filename (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.split('.')[0]}.${file.mimetype.split('/')[1]}`)
  }
})

const upload: UploadService = {
  async initialize (app: Application): Promise<{ stop: () => Promise<void> }> {
    const limits = {
      fileSize: config.get<number>('fileSizeLimit')
    }

    const uploadMiddleware = multer({ storage, limits })

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
      uploadMiddleware.array('files'),
      errorHandler(uploadHandler(providerManager, libp2p), logger)
    )

    // Init get file size route
    app.get(
      ServiceAddresses.FileSize,
      errorHandler(getFileSizeHandler(providerManager), logger)
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
