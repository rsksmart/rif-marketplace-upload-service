import { Op } from 'sequelize'
import { getRoom } from './index'
import { CommsMessage, CommsPayloads, HashInfoPayload, MessageCodesEnum, UploadJobStatus } from '../definitions'
import { loggingFactory } from '../logger'
import { ProviderManager } from '../providers'
import UploadJob from '../upload/upload.model'

const logger = loggingFactory('communication:handler')

export function messageHandler (
    job: UploadJob,
    storageProvider: ProviderManager
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
    return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
        if (
            message.code === MessageCodesEnum.I_HASH_PINNED
            && (message.payload as HashInfoPayload).hash === job.fileHash.replace('/ipfs/', '')
        ) {
            job.status = UploadJobStatus.PINNED
            await job.save()
            getRoom(job)?.leave()

            const jobs = await UploadJob.findAll({ where: { fileHash: job.fileHash, status: { [Op.ne]: UploadJobStatus.PINNED } } })
            // Unpin files if no jobs for that hash
            if (!jobs.length) {
                await storageProvider?.rm(job.fileHash)
                logger.info(`File ${job.fileHash} for offer ${job.offerId} unpinned`)
            }
        }
    }
}
