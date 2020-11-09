import { Command, flags } from '@oclif/command'
import { Input, OutputFlags } from '@oclif/parser'
import { promisify } from 'util'
import config from 'config'
import fs from 'fs'

import {
  Application,
  Config,
  Logger,
} from './definitions'

const readFile = promisify(fs.readFile)

/**
 * Utility function that capitalize first letter of given string
 * @param value
 */
export function capitalizeFirstLetter (value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Duplicate object using JSON method. Functions are stripped.
 * @param obj
 */
export function duplicateObject<T> (obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}


/**
 * General handler closure function mainly for Event Emitters, which in case of rejected promise logs the rejection
 * using given logger.
 *
 * @param fn
 * @param logger
 * @param exitOnError = false
 */
export function errorHandler (fn: (...args: any[]) => Promise<any>, logger: Logger, exitOnError = false): (...args: any[]) => Promise<any> {
  return (...args) => {
    return fn(...args).catch(err => {
      logger.error(err)
      if (exitOnError) {
        process.exit()
      }
    })
  }
}

/**
 * Helper function which awaits on all the initializations Promises that are set on the `app` object.
 * @param app
 */
export async function waitForReadyApp (app: Application): Promise<void> {
  await app.get('sequelizeSync')
  await app.get('initComms')
  await app.get('ipfsInit')
}

export abstract class BaseCLICommand extends Command {
  static flags = {
    config: flags.string({
      description: 'path to JSON config file to load',
      env: 'RIFSUS_CONFIG'
    }),
    log: flags.string({
      description: 'what level of information to log',
      options: ['error', 'warn', 'info', 'verbose', 'debug'],
      default: 'warn',
      env: 'LOG_LEVEL'
    }),
    'log-filter': flags.string(
      {
        description: 'what components should be logged (+-, chars allowed)'
      }
    ),
    'log-path': flags.string(
      {
        description: 'log to file, default is STDOUT'
      }
    )
  }

  async loadConfig (configPath?: string): Promise<Config> {
    if (!configPath) {
      return {}
    }

    const data = await readFile(configPath, 'utf-8')
    return JSON.parse(data) as Config
  }

  async init (): Promise<void> {
    const { flags: originalFlags } = this.parse(this.constructor as Input<typeof BaseCLICommand.flags>)
    const flags = originalFlags as OutputFlags<typeof BaseCLICommand.flags>

    const logObject = {
      log:
        {
          level: flags.log,
          filter: flags['log-filter'] || null,
          path: flags['log-path'] || null
        }
    }

    const userConfig = await this.loadConfig(flags.config)

    config.util.extendDeep(config, userConfig)
    config.util.extendDeep(config, logObject)

    return Promise.resolve()
  }
}
