import config from 'config'
import { Op } from 'sequelize'
import { leaveRoom, rooms } from './communication'
import { loggingFactory } from './logger'

import { ProviderManager } from './providers'
import UploadJob from './upload/upload.model'

const logger = loggingFactory('jobs:gc')

export default async function (storageProvider: ProviderManager): Promise<void> {
  const jobsTtl = config.get<number>('gc.jobTtl')

  const jobsToRemove = await UploadJob.findAll({
    where: {
      createdAt: { [Op.lte]: Date.now() - jobsTtl }
    }
  })

  // Unpin file and remove expired jobs
  for (const job of jobsToRemove) {
    await storageProvider.rm(job.fileHash).catch(e => logger.error(e))
    await job.destroy()
  }

  // Leave rooms for no jobs offers
  for (const [topic] of rooms) {
    const offerId = topic.split(':')[1]
    const jobsForOffer = await UploadJob.count({ where: { offerId } })

    if (!jobsForOffer) {
      leaveRoom(topic)
    }
  }
}
