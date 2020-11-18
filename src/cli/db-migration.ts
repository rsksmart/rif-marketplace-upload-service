import fs from 'fs'
import path from 'path'
import { flags } from '@oclif/command'
import { OutputFlags } from '@oclif/parser'
import config from 'config'

import DbMigration from '../migrations'
import { BaseCLICommand } from '../utils'
import { sequelizeFactory } from '../sequelize'

const MigrationTemplate = `import Sequelize, { QueryInterface } from 'sequelize'
import { Sequelize as SequelizeTs } from 'sequelize-typescript'

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    return Promise.reject(Error('Not implemented'))
  },
  // eslint-disable-next-line require-await
  async down (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    return Promise.reject(Error('Not implemented'))
  }
}
`

export default class DbMigrationCommand extends BaseCLICommand {
  static hidden: boolean;
  static flags = {
    ...BaseCLICommand.flags,
    db: flags.string({ description: 'database connection URI', env: 'RIFM_DB' }),
    up: flags.boolean({
      char: 'u',
      description: 'Migrate DB',
      exclusive: ['down', 'generate']
    }),
    down: flags.boolean({
      char: 'd',
      description: 'Undo db migrations',
      exclusive: ['up', 'generate']
    }),
    generate: flags.string({
      char: 'd',
      description: 'Generate migrations using template [--generate=migration_name]',
      exclusive: ['up', 'down']
    }),
    to: flags.string({
      char: 't',
      description: 'Migrate to'
    }),
    migration: flags.string({
      char: 'm',
      description: 'Migration file',
      multiple: true
    })
  }

  static description = 'DB migrations'

  static examples = [
    '$ rif-marketplace-upload-service db-migration --up',
    '$ rif-marketplace-upload-service db-migration --down',
    '$ rif-marketplace-upload-service db-migration --up --to 0-test',
    '$ rif-marketplace-upload-service db-migration --up --migrations 01-test --migrations 02-test',
    '$ rif-marketplace-upload-service db-migration --up --db ./test.sqlite --to 09-test',
    '$ rif-marketplace-upload-service db-migration --down --db ./test.sqlite --to 09-test',
    '$ rif-marketplace-upload-service db-migration --generate my_first_migration'
  ]

  private migration: DbMigration | undefined

  async migrate (migrations?: string[], options?: { to: string }): Promise<void> {
    if (!(await this.migration!.pending()).length) {
      this.log('No pending migrations found')
      this.exit()
    }

    this.log('DB migrations')
    await this.migration!.up(options)
    this.log('Done')
  }

  async undo (migrations?: string[], options?: { to: string }): Promise<void> {
    if (!(await this.migration!.executed()).length) {
      this.log('No executed migrations found')
      this.exit()
    }

    this.log('Undo DB migrations')
    await this.migration!.down(options)
    this.log('Done')
  }

  generateMigration (name: string): void {
    const migrationsFolder = path.resolve(__dirname, '../migrations')
    const scriptsFolder = path.resolve(__dirname, '../migrations/scripts')
    const fileName = `./${Date.now()}-${name}.ts`
    const filePath = path.resolve(scriptsFolder, fileName)

    if (!fs.existsSync(migrationsFolder)) {
      throw new Error('Migrations folder not found. Please run command from project root and make sure that you have \'migrations\' folder setup')
    }

    this.log(`Creating migration ${fileName}`)

    if (!fs.existsSync(scriptsFolder)) {
      fs.mkdirSync(scriptsFolder)
    }

    fs.writeFileSync(filePath, MigrationTemplate)
    this.log('Done')
  }

  async run (): Promise<void> {
    const { flags: originalFlags } = this.parse(DbMigrationCommand)
    const parsedFlags = originalFlags as OutputFlags<typeof DbMigrationCommand.flags>

    if (parsedFlags.db) {
      config.util.extendDeep(config, { db: parsedFlags.db })
    }

    if (parsedFlags.generate) {
      this.generateMigration(parsedFlags.generate)
    }

    // Init database connection
    const sequelize = sequelizeFactory()
    this.migration = new DbMigration(sequelize)

    if (!parsedFlags.up && !parsedFlags.down && !parsedFlags.generate) {
      throw new Error('One of \'--generate, --up, --down\'  required')
    }

    if (parsedFlags.up) {
      await this.migrate(parsedFlags.migration, parsedFlags)
    }

    if (parsedFlags.down) {
      await this.undo(parsedFlags.migration, parsedFlags)
    }

    this.exit()
  }
}
