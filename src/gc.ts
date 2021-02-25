import config from 'config'
import { Op } from 'sequelize'
import parse from 'parse-duration'

import { leaveRoom, rooms } from './communication'
import { Application } from './definitions'
import { NotPinnedError } from './errors'
import { loggingFactory } from './logger'
import { ProviderManager } from './providers'
import UploadClients from './upload/clients.model'
import UploadJob from './upload/upload.model'

const logger = loggingFactory('jobs:gc')

export async function gcFiles (storageProvider: ProviderManager): Promise<void> {
  let jobsTtl
  try {
    jobsTtl = parse(config.get<string>('gc.jobs.ttl'))
  } catch (e) {
    throw new Error('Invalid jobs ttl value')
  }

  const jobsToRemove = await UploadJob.findAll({
    where: {
      createdAt: { [Op.lte]: Date.now() - jobsTtl! }
    }
  })

  // Unpin file and remove expired jobs
  for (const job of jobsToRemove) {
    await storageProvider.rm(job.fileHash).catch(e => {
      // If file already unpinned ignore error and remove job from db
      if (e instanceof NotPinnedError) {
        return
      }
      throw e
    })
    await job.destroy()
    logger.info(`Expired job ${job.id} file hash ${job.fileHash} is unpined and removed`)
  }

  // Leave rooms for no jobs offers
  for (const [topic] of rooms) {
    const [, contractAddress, offerId] = topic.split(':')
    const jobsForOffer = await UploadJob.count({ where: { offerId, contractAddress } })

    if (!jobsForOffer) {
      leaveRoom(topic)
    }
  }
}

export async function gcClients (): Promise<void> {
  let clientsTtl
  try {
    clientsTtl = parse(config.get<string>('gc.clients.ttl'))
  } catch (e) {
    throw new Error('Invalid jobs ttl value')
  }
  await UploadClients.findAll({
    where: {
      createdAt: { [Op.lte]: Date.now() - clientsTtl! }
    }
  })
}

export function runJobsGc (app: Application): NodeJS.Timeout {
  const gcInterval = parse(config.get<string>('gc.jobs.interval'))

  if (!gcInterval) {
    throw new Error('Invalid GC interval value')
  }

  logger.info(`Jobs GC started with interval ${config.get('gc.jobs.interval')}`)
  const storageProvider = app.get('storage')
  return setInterval(() => gcFiles(storageProvider), gcInterval)
}

export function runClientsGc (): NodeJS.Timeout {
  const gcInterval = parse(config.get<string>('gc.clients.interval'))

  if (!gcInterval) {
    throw new Error('Invalid GC interval value for "Clients" job')
  }

  logger.info(`"Clients" GC started with interval ${config.get('gc.clients.interval')}`)
  return setInterval(() => gcClients(), gcInterval)
}

export default function (app: Application): { stop: () => void } {
  const jobsIntervalId = runJobsGc(app)
  const clientIntervalId = runClientsGc()

  return {
    stop: () => {
      clearInterval(jobsIntervalId)
      clearInterval(clientIntervalId)
    }
  }
}
