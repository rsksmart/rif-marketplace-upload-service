import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import path from 'path'
import config from 'config'
import sqlFormatter from 'sql-formatter'

import DbMigration from './migrations/index'
import { Application } from './definitions'
import { loggingFactory } from './logger'

const logger = loggingFactory('db')

function formatLogs (msg: string): string {
  const result = msg.match(/^Executing \(([\w\d-]+)\): (.*)/m)

  if (!result) {
    return msg
  }

  return `Executing SQL (${result[1]}):\n${sqlFormatter.format(result[2])}`
}

export function sequelizeFactory (): Sequelize {
  const dbSettings: SequelizeOptions = {
    models: [path.join(__dirname, '/**/*.model.+(ts|js)')],
    modelMatch: (filename: string, member: string): boolean => {
      return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase()
    },
    logging: (msg) => logger.debug(formatLogs(msg)),
    // @ts-ignore
    transactionType: 'IMMEDIATE'
  }

  return new Sequelize(`sqlite:${config.get('db')}`, dbSettings)
}

async function migrationCheck (sequelize: Sequelize): Promise<void> {
  const migration = new DbMigration(sequelize)

  if ((await migration.pending()).length) {
    logger.error('DB Migration required. Please use \'db-migration\' command to proceed')
    process.exit()
  }
}

export default function (app: Application): void {
  const sequelize = sequelizeFactory()
  const oldSetup = app.setup

  app.set('sequelize', sequelize)
  app.set('sequelizeInit', migrationCheck(sequelize))

  app.setup = function (...args): ReturnType<Application['setup']> {
    const result = oldSetup.apply(this, args)

    // Set up data relationships
    const models = sequelize.models
    Object.keys(models).forEach(name => {
      if ('associate' in models[name]) {
        (models[name] as any).associate(models)
      }
    })

    return result
  }
}
