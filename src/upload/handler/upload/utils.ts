import CID from 'cids'
import config from 'config'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import checkDiskSpace from 'check-disk-space'
import { Logger, UploadJobStatus } from '../../../definitions'

import { loggingFactory } from '../../../logger'
import { ProviderManager } from '../../../providers'
import UploadClient from '../../model/clients.model'
import UploadJob from '../../model/upload.model'

const logger = loggingFactory('upload:handler')

export async function unlinkFiles (files: any[]): Promise<void> {
  for (const file of files) {
    await fs.promises.unlink(file.path)
    logger.info(`File ${file.filename} removed from fs`)
  }
}

export async function isClientAllowedToUpload (req: any): Promise<boolean> {
  const ip = req.clientIp
  logger.debug(`Client IP address = ${ip}`)
  const client = await UploadClient.findOne({ where: { ip } })

  return !client || client.uploads < config.get<number>('uploadLimitPerPeriod')
}

export async function increaseClientUploadCounter (req: any): Promise<void> {
  const ip = req.clientIp
  const client = await UploadClient.findOne({ where: { ip } })

  if (!client) {
    await UploadClient.create({ ip, uploads: 1 })
  } else {
    client.uploads += 1
    await client.save()
  }
}

export async function isEnoughSpace (): Promise<boolean> {
  try {
    const { free } = await checkDiskSpace('/')
    logger.debug(`Free disk space = ${free}`)
    return free >= config.get<number>('fileSizeLimit') + 1024 ** 3 // should be at least 1gb + fileSizeLimit
  } catch (e) {
    logger.error(`CHECK-DISK-SPACE: ${e.message}`)
    return false
  }
}

export function getUploadMiddleware (uploadPath: string, field: string) {
  const storage = multer.diskStorage({
    destination (req, file, cb) {
      cb(null, path.join(process.cwd(), uploadPath))
    },
    filename (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname.split('.')[0]}.${file.mimetype.split('/')[1]}`)
    }
  })

  return multer({
    storage,
    limits: { fileSize: config.get<number>('fileSizeLimit') }
  }).array(field)
}

export function fileUploader (storageProvider: ProviderManager, logger: Logger) {
  return async (req: any): Promise<{ fileSize: number, cid: CID }> => {
    const { offerId, peerId, account, contractAddress } = req.body

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

    return { fileSize, cid }
  }
}
