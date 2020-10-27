import { Op } from 'sequelize'
import { getRoom, getRoomTopic } from '../communication'
import { CommsMessage, CommsPayloads, MessageCodesEnum, UploadJobStatus } from '../definitions'
import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'
import UploadJob from '../upload/upload.model'

const logger = loggingFactory('communication:handler')

export function messageHandler (
    job: UploadJob,
    storageProvider: ProviderManager
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
    return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
        if (!job) {
            logger.verbose(`Job for agreement ${message.payload.agreementReference} not found`)
            return
        }

        if (message.code === MessageCodesEnum.I_HASH_PINNED) {
            job.status = UploadJobStatus.PINNED
            await job.save()
            getRoom(getRoomTopic(job.offerId))?.leave()

            const jobs = await UploadJob.findAll({ where: { fileHash: job.fileHash, status: { [Op.ne]: UploadJobStatus.PINNED } } })
            // Unpin files if no jobs for that hash
            if (!jobs.length) {
                await storageProvider?.rm(job.fileHash)
            }
        }
    }
}
