import { Table, Column, Model } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'upload_client'
})
export default class UploadClient extends Model {
  @Column({ allowNull: false, primaryKey: true })
  ip!: string

  @Column({ allowNull: false })
  uploads!: number
}
