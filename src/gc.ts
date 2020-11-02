import config from 'config'
import { Op } from 'sequelize'
import parse from 'parse-duration'

import { leaveRoom, rooms } from './communication'
import { Application } from './definitions'
import { loggingFactory } from './logger'
import { ProviderManager } from './providers'
import UploadJob from './upload/upload.model'

const logger = loggingFactory('jobs:gc')

export async function gcFiles (storageProvider: ProviderManager): Promise<void> {
  const jobsTtl = parse(config.get<string>('gc.jobTtl'))

  if (!jobsTtl) {
    throw new Error('Invalid jobs ttl value')
  }

  const jobsToRemove = await UploadJob.findAll({
    where: {
      createdAt: { [Op.lte]: Date.now() - jobsTtl }
    }
  })

  // Unpin file and remove expired jobs
  for (const job of jobsToRemove) {
    await storageProvider.rm(job.fileHash).catch(e => logger.error(e))
    await job.destroy()
    logger.info(`Expired job ${job.id} file hash ${job.fileHash} is unpined and removed`)
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

export default function (app: Application): { stop: () => void } {
  const gcInterval = parse(config.get<string>('gc.interval'))

  if (!gcInterval) {
    throw new Error('Invalid GC interval value')
  }

  logger.info(`GC started with interval ${config.get('gc.interval')}`)
  const storageProvider = app.get('storage')
  const interval = setInterval(() => gcFiles(storageProvider), gcInterval)
  return { stop: () => clearInterval(interval) }
}
