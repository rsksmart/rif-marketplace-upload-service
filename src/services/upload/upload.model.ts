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

  @Column({ allowNull: false })
  status!: string

  @Column({ type: DataType.JSON, allowNull: false })
  meta!: Record<any, any>
}
