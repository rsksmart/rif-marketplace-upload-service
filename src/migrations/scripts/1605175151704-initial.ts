import Sequelize, { QueryInterface } from 'sequelize'
import { Sequelize as SequelizeTs } from 'sequelize-typescript'

/**
 * Actions summary:
 *
 * createTable "upload_job", deps: []
 *
 **/
type Commands = { fn: keyof QueryInterface, [key: string]: any }[]
const migrationCommands = function (transaction: any): Commands {
  return [
    // Event
    {
      fn: 'createTable',
      params: [
        'upload_job',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          offerId: {
            type: Sequelize.STRING(64),
            field: 'offerId',
            allowNull: false
          },
          account: {
            type: Sequelize.STRING(),
            field: 'account',
            allowNull: false
          },
          fileHash: {
            type: Sequelize.STRING,
            field: 'fileHash'
          },
          peerId: {
            type: Sequelize.STRING,
            field: 'peerId',
            allowNull: false
          },
          status: {
            type: Sequelize.STRING,
            field: 'status',
            allowNull: false
          },
          meta: {
            type: Sequelize.JSON,
            field: 'meta',
            allowNull: false
          },
          createdAt: {
            type: Sequelize.DATE,
            field: 'createdAt',
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            field: 'updatedAt',
            allowNull: false
          }
        },
        {
          transaction: transaction
        }
      ]
    }
  ]
}
const rollbackCommands = function (transaction: any): Commands {
  return [
    {
      fn: 'dropTable',
      params: [
        'upload_job', {
          transaction: transaction
        }
      ]
    }
  ]
}

function run (queryInterface: QueryInterface, _commands: (transaction: any) => Commands) {
  return async function (transaction: any): Promise<void> {
    for (const command of _commands(transaction)) {
      // @ts-ignore: QueryInterface not typed correctly
      // eslint-disable-next-line prefer-spread
      await queryInterface[command.fn].apply(queryInterface, command.params)
    }
  }
}

export default {
  async up (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    await queryInterface.sequelize.transaction(run(queryInterface, migrationCommands))
  },
  async down (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    await queryInterface.sequelize.transaction(run(queryInterface, rollbackCommands))
  }
}
