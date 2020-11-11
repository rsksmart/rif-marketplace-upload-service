import PubSubRoom from '@rsksmart/rif-communications-pubsub/types/pubsub'
import config from 'config'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'

import { getRoomTopic, rooms } from '../../src/communication'
import { UploadJobStatus } from '../../src/definitions'
import { gcFiles } from '../../src/gc'
import { ProviderManager } from '../../src/providers'
import * as comms from '../../src/communication'
import { sequelizeFactory } from '../../src/sequelize'
import UploadJob from '../../src/upload/upload.model'
import { sleep } from '../utils'

chai.use(dirtyChai)
const expect = chai.expect

describe('GC', function () {
  this.timeout(500)
  const jobTtl = config.get('gc.jobTtl')
  const leaveRoomSpy = sinon.spy()
  const providerRmSpy = sinon.spy()
  let provider: ProviderManager

  before(async () => {
    const sequelize = sequelizeFactory()
    await sequelize.sync({ force: true })
    sinon.stub(ProviderManager.prototype, 'rm').callsFake((hash: string) => {
      providerRmSpy(hash)
      return Promise.resolve()
    })
    provider = new ProviderManager()
    sinon.stub(comms, 'leaveRoom').callsFake((topic: string) => {
      leaveRoomSpy(topic)
    })
  })
  afterEach(async () => {
    await UploadJob.destroy({ where: {} })
    providerRmSpy.resetHistory()
    leaveRoomSpy.resetHistory()
  })
  after(() => {
    sinon.restore()
  })

  it('should throw if jobTtl not provided', async () => {
    // @ts-ignore
    config.gc.jobTtl = null

    try {
      await gcFiles(provider)
    } catch (e) {
      expect(e.message).to.be.eql('Invalid jobs ttl value')
      expect(providerRmSpy.notCalled).to.be.eql(true)
    }
    // @ts-ignore
    config.gc.jobTtl = jobTtl
  })
  it('should remove expired jobs', async () => {
    // @ts-ignore
    config.gc.jobTtl = '100ms'

    rooms.set(getRoomTopic('test', 'test'), { room: {} as PubSubRoom, peerId: 'testPeer' })

    const jobs = await UploadJob.bulkCreate([
      { offerId: 'test', account: 'testAcc', fileHash: 'file1', peerId: 'testPeer', status: UploadJobStatus.WAITING_FOR_PINNING },
      { offerId: 'test', account: 'testAcc', fileHash: 'file2', peerId: 'testPeer', status: UploadJobStatus.WAITING_FOR_PINNING },
      { offerId: 'test', account: 'testAcc', fileHash: 'file3', peerId: 'testPeer', status: UploadJobStatus.WAITING_FOR_PINNING }
    ])
    expect(jobs.length).to.be.eql(3)
    expect(rooms.size).to.be.eql(1)

    await sleep(150)

    await gcFiles(provider)

    expect(await UploadJob.count()).to.be.eql(0)
    expect(providerRmSpy.calledOnceWith(jobs[0].fileHash))
    expect(providerRmSpy.calledOnceWith(jobs[1].fileHash))
    expect(providerRmSpy.calledOnceWith(jobs[2].fileHash))
    expect(providerRmSpy.calledOnceWith(jobs[2].fileHash))
    expect(leaveRoomSpy.calledWith(getRoomTopic('test', 'test')))

    // @ts-ignore
    config.gc.jobTtl = jobTtl
  })
})
