import Listr from 'listr'

import uploadService from '../upload'
import { sequelizeFactory } from '../sequelize'
import { BaseCLICommand } from '../utils'
import { SupportedServices } from '../definitions'

export default class Purge extends BaseCLICommand {
  static get description () {
    const formattedServices = Object.values(SupportedServices).map(service => ` - ${service}`).join('\n')
    return `purge cached data

Can purge all data or for specific service.
Currently supported services:
 - all
${formattedServices}`
  }

  static examples = [
    '$ rif-storage-upload-service purge all',
    '$ rif-storage-upload-service purge storage rns'
  ]

  static flags = BaseCLICommand.flags

  static args = [{ name: 'service' }]

  static strict = false

  async run (): Promise<void> {
    const { argv } = this.parse(Purge)

    // Init database connection
    const sequelize = sequelizeFactory()

    this.log('Removing cached data for service:')
    const tasks = new Listr([{
      title: 'Upload service',
      task: uploadService.purge
    }])
    await tasks.run()
    this.exit(0)
  }
}
