import fs from 'fs'
import { Comms } from '../../communication'
import { UploadJobStatus } from '../../definitions'
import { loggingFactory } from '../../logger'
import { ProviderManager } from './providers'
import UploadJob from './upload.model'

const logger = loggingFactory('upload.handler')
type UploadRouteHandler = (req: any, res: any) => Promise<void>

export default function (storageProvider: ProviderManager, comms: Comms): UploadRouteHandler {
    return async (req: any, res: any): Promise<void> => {
        const { offerId, agreementReference, peerId } = req.body

        logger.info(`Receive file ${req.file.path} for offer ${offerId}, agreement ${agreementReference}, peerId ${peerId}`)

        if (!req.file) {
            return res.status(422).json({
                error: 'File needs to be provided.'
            })
        }

        // Create upload job
        const job = await UploadJob.create({ offerId, agreementReference, status: UploadJobStatus.UPLOADING })
        logger.debug('Job created')

        // Read file from fs and start uploading to storage
        const data = await fs.promises.readFile(req.file.path)
        const { path: hash } = await storageProvider.add(data)
        logger.debug(`File uploaded to IPFS, file hash ${hash}`)

        // Unlink file from fs
        await fs.promises.unlink(req.file.path)
        logger.debug('File removed from fs')

        // Update job
        job.peerId = peerId
        job.fileHash = hash
        job.status = UploadJobStatus.WAITING_FOR_PINNING
        await job.save()

        // Register room
        await comms.subscribeForOffer(job)

        return res.json({
            message: 'File uploaded',
            fileHash: hash
        });
    }
}

