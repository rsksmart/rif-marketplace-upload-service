import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'upload_clients'
})
export default class UploadClients extends Model {
  @Column({ allowNull: false, primaryKey: true })
  ip!: string

  @Column({ allowNull: false })
  uploads!: number
}
