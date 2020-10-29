import { Op } from 'sequelize'

import { leaveRoom } from './index'
import {
    AgreementInfoPayload,
    CommsMessage,
    CommsPayloads,
    HashInfoPayload, Logger,
    MessageCodesEnum,
    UploadJobStatus
} from '../definitions'
import { ProviderManager } from '../providers'
import UploadJob from '../upload/upload.model'

async function hashPinnedHandler (
    message: CommsMessage<HashInfoPayload>,
    storageProvider: ProviderManager,
    roomLogger: Logger
): Promise<void> {
    // TODO extend Pinnner
    const job = await UploadJob.findOne(
        {
            where: {
                fileHash: `/ipfs/${message.payload.hash}`,
                // agreementReference: payload.agreementReference
            }
        }
    )

    if (!job) {
        roomLogger.error(`Job for file ${message.payload.hash} not found`)
        return
    }

    // Update job status to PINNED
    job.status = UploadJobStatus.PINNED
    await job.save()

    // Unpinn file if not active jobs for that hash
    const pendingJobsForHash = await UploadJob.count({ where: { fileHash: job.fileHash, status: { [Op.ne]: UploadJobStatus.PINNED } } })
    if (pendingJobsForHash === 0) {
        await storageProvider?.rm(job.fileHash)
        roomLogger.info(`File ${job.fileHash} for offer ${job.offerId} unpinned`)
    }

    // Leave room if not active jobs for that offer
    const pendingJobsForOffer = await UploadJob.count({ where: { offerId: job.offerId, status: { [Op.ne]: UploadJobStatus.PINNED } } } )
    if (pendingJobsForOffer === 0) {
        roomLogger.info(`Leaving room`)
        leaveRoom(job)
    }
}

async function newAgreementHandler (
    message: CommsMessage<AgreementInfoPayload>,
    offerId: string,
): Promise<void> {
    // TODO extend Pinnner
    const [job] = await UploadJob.findAll({
        where: {
            offerId,
            status: { [Op.ne]: UploadJobStatus.PINNED },
            // hash: `/ipfs/${message.payload.hash}`,
            // account: message.payload.account
        }
    })
    job.agreementReference = message.payload.agreementReference
    await job.save()
}

export function messageHandler (
    offerId: string,
    storageProvider: ProviderManager,
    roomLogger: Logger
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
    return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
        switch (message.code) {
            case MessageCodesEnum.I_HASH_PINNED:
                await hashPinnedHandler(message as CommsMessage<HashInfoPayload>, storageProvider, roomLogger)
                break
            case MessageCodesEnum.I_AGREEMENT_NEW:
                await newAgreementHandler(message as CommsMessage<AgreementInfoPayload>, offerId)
                break
            default:
                break
        }
    }
}
