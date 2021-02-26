import compress from 'compression'
import helmet from 'helmet'
import cors, { CorsOptionsDelegate } from 'cors'
import config from 'config'
import requestIp from 'request-ip'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { Sequelize } from 'sequelize'

import { Application } from './definitions'
import { loggingFactory } from './logger'
import sequelize from './sequelize'
import healthcheck from './healthcheck'
import communication, { stopComms } from './communication'
import storageProvider from './providers'
import jobsGC from './gc'
import uploadService from './upload'
import { errorHandler } from './utils'

const logger = loggingFactory()

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

  // Enable IP mdlw
  app.use(requestIp.mw())

  // Set up Plugins and providers
  app.configure(express.rest())
  app.configure(socketio())

  // Custom general services
  app.configure(sequelize)
  app.configure(healthcheck)
  app.configure(communication)
  app.configure(storageProvider)

  /**********************************************************/

  // Init upload service
  const uploadServiceInstance = await errorHandler(uploadService.initialize, logger, true)(app)

  // Init Jobs GC
  const stopGc = jobsGC(app)

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
    stop: async (): Promise<void> => {
      stopGc.stop()
      await uploadServiceInstance.stop()
      const sequelize = app.get('sequelize') as Sequelize
      await stopComms(app.get('libp2p'))
      await sequelize.close()
    }
  }
}
