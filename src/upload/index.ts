import * as fs from 'fs'
import multer from 'multer'
import path from 'path'

import { Application, UploadService, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import { errorHandler, waitForReadyApp } from '../utils'
import UploadJob from './upload.model'
import uploadHandler from './upload.handler'
import { sleep } from '../../test/utils'

const UPLOAD = 'upload'
const UPLOAD_FOLDER = 'uploads'
const logger = loggingFactory(UPLOAD)

const storage = multer.diskStorage({
  destination (req, file, cb) {
    cb(null, path.join(process.cwd(), UPLOAD_FOLDER))
  },
  filename (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.split('.')[0]}.${file.mimetype.split('/')[1]}`)
  }
})

const uploadMiddleware = multer({ storage })

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
      uploadMiddleware.single('file'),
      errorHandler(uploadHandler(providerManager, libp2p), logger)
    )

    // Run GC job
    // await uploadJobGc(providerManager)

    return {
      stop: () => Promise.resolve(undefined)
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
