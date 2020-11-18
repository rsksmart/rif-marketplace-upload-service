import Sequelize, { QueryInterface } from 'sequelize'
import { Sequelize as SequelizeTs } from 'sequelize-typescript'

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    return queryInterface.addColumn(
      'upload_job',
      'contractAddress',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: ''
      }
    )
  },
  // eslint-disable-next-line require-await
  async down (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    return queryInterface.removeColumn(
      'upload_job',
      'contractAddress'
    )
  }
}
