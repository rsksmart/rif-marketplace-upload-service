import Listr from 'listr'

import uploadService from '../upload'
import { sequelizeFactory } from '../sequelize'
import { BaseCLICommand } from '../utils'

export default class Purge extends BaseCLICommand {
  static get description () {
    return 'purge cached data'
  }

  static examples = ['$ rif-marketplace-upload-service purge']

  static flags = BaseCLICommand.flags

  static strict = false

  async run (): Promise<void> {
    const { argv } = this.parse(Purge)

    // Init database connection
    const sequelize = sequelizeFactory()

    this.log('Removing cached data for service:')
    const tasks = new Listr([
      {
        title: 'Upload service',
        task: uploadService.purge
      }
    ])
    await tasks.run()
    this.exit(0)
  }
}
