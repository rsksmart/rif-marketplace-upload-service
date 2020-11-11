import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'upload_job'
})
export default class UploadJob extends Model {
  @Column({ allowNull: false, type: DataType.STRING(64) })
  offerId!: string

  @Column({ allowNull: false })
  account!: string

  @Column
  fileHash!: string

  @Column
  contractAddress!: string

  @Column
  peerId!: string

  @Column({ allowNull: false })
  status!: string

  @Column({ type: DataType.JSON })
  meta!: Record<any, any>
}
