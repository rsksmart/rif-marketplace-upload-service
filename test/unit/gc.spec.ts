import PubSubRoom from '@rsksmart/rif-communications-pubsub/types/pubsub'
import config from 'config'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'

import { getRoomTopic, rooms } from '../../src/communication'
import { UploadJobStatus } from '../../src/definitions'
import { gcClients, gcFiles } from '../../src/gc'
import { ProviderManager } from '../../src/providers'
import * as comms from '../../src/communication'
import { sequelizeFactory } from '../../src/sequelize'
import UploadClient from '../../src/upload/model/clients.model'
import UploadJob from '../../src/upload/model/upload.model'
import { sleep } from '../utils'

chai.use(dirtyChai)
const expect = chai.expect

describe('GC: jobs', function () {
  this.timeout(1000)
  const jobTtl = config.get('gc.jobs.ttl')
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
    // @ts-ignore: Config not typed
    config.gc.jobs.ttl = null

    try {
      await gcFiles(provider)
    } catch (e) {
      expect(e.message).to.be.eql('Invalid jobs ttl value')
      expect(providerRmSpy.notCalled).to.be.eql(true)
    }
    // @ts-ignore: Config not typed
    config.gc.jobs.ttl = jobTtl
  })
  it('should remove expired jobs', async () => {
    // @ts-ignore: Config not typed
    config.gc.jobs.ttl = '100ms'

    const contractAddress = '0xTestContractAddress'
    rooms.set(getRoomTopic('test', contractAddress), {} as PubSubRoom)

    const jobs = await UploadJob.bulkCreate([
      { offerId: 'test', account: 'testAcc', contractAddress, fileHash: 'file1', peerId: 'testPeer', status: UploadJobStatus.WAITING_FOR_PINNING },
      { offerId: 'test', account: 'testAcc', contractAddress, fileHash: 'file2', peerId: 'testPeer', status: UploadJobStatus.WAITING_FOR_PINNING },
      { offerId: 'test', account: 'testAcc', contractAddress, fileHash: 'file3', peerId: 'testPeer', status: UploadJobStatus.WAITING_FOR_PINNING }
    ])
    expect(jobs.length).to.be.eql(3)
    expect(rooms.size).to.be.eql(1)

    await sleep(300)

    await gcFiles(provider)

    expect(await UploadJob.count()).to.be.eql(0)
    expect(providerRmSpy.calledOnceWith(jobs[0].fileHash))
    expect(providerRmSpy.calledOnceWith(jobs[1].fileHash))
    expect(providerRmSpy.calledOnceWith(jobs[2].fileHash))
    expect(leaveRoomSpy.calledWith(getRoomTopic('test', 'test')))

    // @ts-ignore: Config not typed
    config.gc.jobs.ttl = jobTtl
  })
})
describe('GC: clients', function () {
  this.timeout(1000)
  const clientTtl = config.get('gc.clients.ttl')

  before(async () => {
    const sequelize = sequelizeFactory()
    await sequelize.sync({ force: true })
  })
  afterEach(async () => {
    await UploadClient.destroy({ where: {} })
  })
  it('should throw if clientsTtl not provided', async () => {
    // @ts-ignore: Config not typed
    config.gc.clients.ttl = null

    try {
      await gcClients()
    } catch (e) {
      expect(e.message).to.be.eql('Invalid clients ttl value')
    }
    // @ts-ignore: Config not typed
    config.gc.clients.ttl = clientTtl
  })
  it('should remove expired clients', async () => {
    // @ts-ignore: Config not typed
    config.gc.clients.ttl = '100ms'

    const clients = await UploadClient.bulkCreate([
      { ip: '1', uploads: 1 },
      { ip: '2', uploads: 1 },
      { ip: '3', uploads: 1 }
    ])
    expect(clients.length).to.be.eql(3)

    await sleep(300)

    await gcClients()

    expect(await UploadClient.count()).to.be.eql(0)

    // @ts-ignore: Config not typed
    config.gc.clients.ttl = clientTtl
  })
})
