import fs from 'fs'
import { Comms } from '../../communication'
import { UploadJobStatus } from '../../definitions'
import { ProviderManager } from './providers'
import UploadJob from './upload.model'

type UploadRouteHandler = (req: any, res: any) => Promise<void>

export default function (storageProvider: ProviderManager, comms: Comms): UploadRouteHandler {
    return async (req: any, res: any): Promise<void> => {
        const { offerId, agreementReference, peerId } = req.body

        if (!req.file) {
            return res.status(422).json({
                error: 'File needs to be provided.'
            })
        }

        // Create upload job
        const job = await UploadJob.create({ offerId, agreementReference, status: UploadJobStatus.UPLOADING })

        // Read file from fs and start uploading to storage
        const data = await fs.promises.readFile(req.file.path)
        const { hash } = await storageProvider.add(data)

        // Unlink file from fs
        await fs.promises.unlink(req.file.path)

        // Update job
        job.fileHash = peerId
        job.fileHash = hash
        job.status = UploadJobStatus.WAITING_FOR_PINNING
        await job.save()

        // Register room
        await comms.subscribeForOffer(job)
    }
}

