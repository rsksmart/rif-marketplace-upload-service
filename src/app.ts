import compress from 'compression'
import helmet from 'helmet'
import cors, { CorsOptionsDelegate } from 'cors'
import config from 'config'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { Sequelize } from 'sequelize'

import { Application, SupportedServices } from './definitions'
import { loggingFactory } from './logger'
import sequelize from './sequelize'
import healthcheck from './healthcheck'
import communication from './communication'
import { errorHandler } from './utils'


import upload from './services/upload'

const logger = loggingFactory()

export const services = {
  [SupportedServices.UPLOAD]: upload,
}


export async function appFactory (): Promise<{ app: Application, stop: () => Promise<void> }> {
  const app: Application = express(feathers())

  logger.verbose('Current configuration: ', config)
  const corsOptions: CorsOptionsDelegate = config.get('cors')

  // Enable security, CORS, compression and body parsing
  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(compress())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Set up Plugins and providers
  app.configure(express.rest())
  app.configure(socketio())

  // Custom general services
  app.configure(sequelize)
  app.configure(healthcheck)
  app.configure(communication)

  /**********************************************************/

  // Configure each services
  const servicePromises: Promise<{ stop: () => void }>[] = []
  for (const service of Object.values(services)) {
    app.configure((app) => servicePromises.push(errorHandler(service.initialize, logger, true)(app)))
  }

  // Wait for services to initialize
  const servicesInstances = await Promise.all(servicePromises)

  // Log errors in hooks
  app.hooks({
    error (context) {
      logger.error(`Error in '${context.path}' service method '${context.method}'`, context.error.stack)
    }
  })

  // Configure a middleware for 404s and the error handler
  app.use(express.notFound())
  app.use(express.errorHandler({ logger }))

  return {
    app,
    stop: async () => {
      servicesInstances.forEach(service => service.stop())
      const sequelize = app.get('sequelize') as Sequelize
      await sequelize.close()
    }
  }
}
