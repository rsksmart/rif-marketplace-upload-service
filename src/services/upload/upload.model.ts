import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'upload_job'
})
export default class UploadJob extends Model {
  @Column({ allowNull: false })
  agreementReference!: string

  @Column({ allowNull: false })
  offerId!: string

  @Column
  fileHash!: string

  @Column
  peerId!: string

  @Column({ allowNull: false })
  status!: string

  @Column({ type: DataType.JSON })
  meta!: Record<any, any>
}
