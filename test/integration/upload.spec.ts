import { Room } from '@rsksmart/rif-communications-pubsub'
import fs from 'fs'
import FormData from 'form-data'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import { request } from 'http'
import Libp2p from 'libp2p'
import path from 'path'
import config from 'config'
import PeerId, { JSONPeerId } from 'peer-id'
import { ServiceAddresses, UploadJobStatus } from '../../src/definitions'

import { ProviderManager } from '../../src/providers'
import { UPLOAD_FOLDER } from '../../src/upload'
import UploadJob from '../../src/upload/upload.model'

import { createLibp2pRoom, spawnLibp2p } from '../utils'
import { TestingApp } from './utils'

chai.use(dirtyChai)
const expect = chai.expect

function upload (provider: string, account: string, peerId: string, filePath?: string): Promise<any> {
  const form = new FormData()

  if (filePath) {
    const file = fs.createReadStream(path.resolve(process.cwd(), filePath))
    form.append('file', file)
  }
  form.append('offerId', provider)
  form.append('peerId', peerId)
  form.append('account', account)

  const options = {
    method: 'POST',
    host: 'localhost',
    port: config.get<number>('port'),
    path: ServiceAddresses.Upload,
    headers: form.getHeaders()
  }

  return new Promise((resolve, reject) => {
    const req = request(options, function (res) {
      let body = ''
      res.on('data', function (chunk) {
        body += chunk
      })
      res.on('end', function () {
        if (res.statusCode !== 200) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject({ error: JSON.parse(body), statusCode: res.statusCode })
        }
        resolve(JSON.parse(body))
      })
    })
    form.pipe(req)
  })
}

describe('Upload service', function () {
  this.timeout(5000)
  let testApp: TestingApp
  let libp2p: Libp2p
  let roomPinner: Room

  before(async () => {
    testApp = new TestingApp()
    await testApp.initAndStart()

    // Create libp2p ndoe for pinner
    libp2p = await spawnLibp2p(await PeerId.createFromJSON(testApp.peerId as JSONPeerId))
    // Create PubSub room to listen on events
    roomPinner = await createLibp2pRoom(libp2p, testApp.providerAddress)
  })
  after(async () => {
    await testApp.stop()
  })

  it('should create upload folder', () => {
    const uploadFolderExist = fs.existsSync(path.resolve(process.cwd(), UPLOAD_FOLDER))
    expect(uploadFolderExist).to.be.eql(true)
  })
  it('should init provider and libp2p', () => {
    const libp2p = testApp.app?.app.get('libp2p')
    const storageProvider = testApp.app?.app.get('storage')
    expect(libp2p).to.be.instanceOf(Libp2p)
    expect(storageProvider).to.be.instanceOf(ProviderManager)
  })
  describe('Upload API', () => {
    afterEach(async () => {
      await UploadJob.destroy({ where: { } })
    })
    it('should upload file', async () => {
      const response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, './test/integration/testFile.txt')
      expect(response.message).to.be.eql('File uploaded')
      expect(response.fileHash).to.be.not.null()
      const jobs = await UploadJob.findAll()
      expect(jobs.length).to.be.eql(1)
      const [job] = jobs
      expect(job.account).to.be.eql('testAccount')
      expect(job.peerId).to.be.eql(testApp.peerId?.id as string)
      expect(job.offerId).to.be.eql(testApp.providerAddress)
      expect(job.fileHash).to.be.eql(`/ipfs/${response.fileHash}`)
      expect(job.status).to.be.eql(UploadJobStatus.WAITING_FOR_PINNING)
    })
    it('should throw error if not provide file', async () => {
      try {
        await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string)
      } catch (e) {
        expect(e.error.error).to.be.eql('File needs to be provided.')
        expect(e.statusCode).to.be.eql(422)
      }
    })
  })
})
