import { Room } from '@rsksmart/rif-communications-pubsub'
import fs from 'fs'
import FormData from 'form-data'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import { request } from 'http'
import ipfsClient, { CID, IpfsClient } from 'ipfs-http-client'
import Libp2p from 'libp2p'
import path from 'path'
import config from 'config'
import PeerId, { JSONPeerId } from 'peer-id'

import { rooms } from '../../src/communication'
import { MessageCodesEnum, ServiceAddresses, UploadJobStatus } from '../../src/definitions'
import { ProviderManager } from '../../src/providers'
import { UPLOAD_FOLDER } from '../../src/upload/handler/upload'
import UploadClient from '../../src/upload/model/clients.model'
import UploadJob from '../../src/upload/model/upload.model'
import { duplicateObject } from '../../src/utils'
import jobsGC from '../../src/gc'
import { createLibp2pRoom, sleep, spawnLibp2p } from '../utils'
import { isPinned, TestingApp } from './utils'

chai.use(dirtyChai)
const expect = chai.expect

const contractAddress = '0xTestContractAddress'

function getFileSize (hash?: string): Promise<any> {
  const options = {
    method: 'GET',
    host: 'localhost',
    port: config.get<number>('port'),
    path: ServiceAddresses.FileSize + `?${hash ? 'hash=' + hash : ''}`
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
    req.end()
  })
}

function upload (provider: string, account: string, peerId?: string, filesPath?: string[]): Promise<any> {
  const form = new FormData()

  if (filesPath) {
    filesPath.map((filePath, i) =>
      form.append('files', fs.createReadStream(path.resolve(process.cwd(), filePath)))
    )
  }
  form.append('offerId', provider)
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  peerId && form.append('peerId', peerId)
  form.append('account', account)
  form.append('contractAddress', contractAddress)

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
  this.timeout(30000)
  let testApp: TestingApp
  let libp2p: Libp2p
  let roomPinner: Room
  let ipfs: IpfsClient

  before(async () => {
    testApp = new TestingApp()
    await testApp.initAndStart()

    ipfs = ipfsClient(duplicateObject(config.get<string>('ipfs.clientOptions')))
    // Create libp2p ndoe for pinner
    libp2p = await spawnLibp2p(await PeerId.createFromJSON(testApp.peerId as JSONPeerId))
    // Create PubSub room to listen on events
    roomPinner = await createLibp2pRoom(libp2p, testApp.providerAddress, contractAddress)
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
  describe('GC', () => {
    let gcInterval: string
    let gcClientsInterval: string
    let jobTtl: string
    let clientTtl: string
    let gc: { stop: () => void }
    before(() => {
      gcInterval = config.get<string>('gc.jobs.interval')
      gcClientsInterval = config.get<string>('gc.clients.interval')
      jobTtl = config.get<string>('gc.jobs.ttl')
      clientTtl = config.get<string>('gc.clients.ttl')
      // @ts-ignore: Config not typed
      config.gc.jobs.interval = '1000ms'
      // @ts-ignore: Config not typed
      config.gc.jobs.ttl = '1000ms'
      // @ts-ignore: Config not typed
      config.gc.clients.interval = '1000ms'
      // @ts-ignore: Config not typed
      config.gc.clients.ttl = '1000ms'
      gc = jobsGC(testApp.app!.app)
    })
    after(() => {
      // @ts-ignore: Config not typed
      config.gc.jobs.interval = gcInterval
      // @ts-ignore: Config not typed
      config.gc.jobs.ttl = jobTtl
      // @ts-ignore: Config not typed
      config.gc.clients.interval = gcClientsInterval
      // @ts-ignore: Config not typed
      config.gc.clients.ttl = clientTtl
      gc.stop()
    })
    afterEach(async () => {
      await UploadJob.destroy({ where: {} })
      await UploadClient.destroy({ where: {} })
    })
    it('should remove and unpin expired files', async () => {
      const file1Response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])
      const file2Response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile2.txt'])
      const file3Response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile3.txt'])

      expect(rooms.size).to.be.eql(1)

      expect(file1Response.message).to.be.eql('Files uploaded')
      expect(file1Response.fileHash).to.be.not.null()
      const job1 = await UploadJob.findOne({ where: { fileHash: `/ipfs/${file1Response.fileHash}` } })
      expect(await isPinned(ipfs, new CID(file1Response.fileHash))).to.be.true()
      expect(job1).to.be.instanceOf(UploadJob)

      expect(file2Response.message).to.be.eql('Files uploaded')
      expect(file2Response.fileHash).to.be.not.null()
      const job2 = await UploadJob.findOne({ where: { fileHash: `/ipfs/${file2Response.fileHash}` } })
      expect(await isPinned(ipfs, new CID(file2Response.fileHash))).to.be.true()
      expect(job2).to.be.instanceOf(UploadJob)

      expect(file3Response.message).to.be.eql('Files uploaded')
      expect(file3Response.fileHash).to.be.not.null()
      const job3 = await UploadJob.findOne({ where: { fileHash: `/ipfs/${file3Response.fileHash}` } })
      expect(await isPinned(ipfs, new CID(file3Response.fileHash))).to.be.true()
      expect(job3).to.be.instanceOf(UploadJob)

      await sleep(3000)

      expect(await isPinned(ipfs, new CID(file1Response.fileHash))).to.be.eql(false)
      expect(await isPinned(ipfs, new CID(file2Response.fileHash))).to.be.eql(false)
      expect(await isPinned(ipfs, new CID(file3Response.fileHash))).to.be.eql(false)
      expect(await UploadJob.count()).to.be.eql(0)
      expect(rooms.size).to.be.eql(0)
    })
    it('should remove uploads clients when expired', async () => {
      const file1Response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])

      expect(file1Response.message).to.be.eql('Files uploaded')
      expect(file1Response.fileHash).to.be.not.null()
      const client = await UploadClient.findOne()
      expect(client).to.be.instanceOf(UploadClient)
      expect(client?.uploads).to.be.eql(1)

      await sleep(3000)

      expect(await UploadClient.count()).to.be.eql(0)
    })
  })
  describe('Upload API', () => {
    afterEach(async () => {
      await UploadJob.destroy({ where: { } })
      await UploadClient.destroy({ where: { } })
    })
    it('should upload file', async () => {
      const response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])
      expect(response.message).to.be.eql('Files uploaded')
      expect(response.fileHash).to.be.not.null()
      const jobs = await UploadJob.findAll()
      expect(jobs.length).to.be.eql(1)
      const [job] = jobs
      expect(job.account).to.be.eql('testAccount')
      expect(job.peerId).to.be.eql(testApp.peerId?.id as string)
      expect(job.offerId).to.be.eql(testApp.providerAddress.toLowerCase())
      expect(job.fileHash).to.be.eql(`/ipfs/${response.fileHash}`)
      expect(job.status).to.be.eql(UploadJobStatus.WAITING_FOR_PINNING)
      expect(await isPinned(ipfs, new CID(response.fileHash))).to.be.true()
      const fileSize = await ipfs.object.stat(new CID(response.fileHash))
      expect(fileSize.CumulativeSize).to.be.eql(response.fileSize)
      await ipfs.pin.rm(new CID(response.fileHash))
    })
    it('should track upload attempts per IP', async () => {
      const response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])
      expect(response.message).to.be.eql('Files uploaded')
      expect(response.fileHash).to.be.not.null()

      const clients = await UploadClient.findAll()
      expect(clients.length).to.be.eql(1)
      const [clientFirstUpload] = clients
      expect(clientFirstUpload.ip).to.be.an('string')
      expect(clientFirstUpload.uploads).to.be.eql(1)

      const response2 = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile2.txt'])
      expect(response2.message).to.be.eql('Files uploaded')
      expect(response2.fileHash).to.be.not.null()

      const clients2 = await UploadClient.findAll()
      expect(clients2.length).to.be.eql(1)
      const [clientSecondUpload] = clients2
      expect(clientSecondUpload.ip).to.be.an('string')
      expect(clientSecondUpload.uploads).to.be.eql(2)
    })
    it('should upload file and unpin when receive pinned message', async () => {
      const response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])
      expect(response.message).to.be.eql('Files uploaded')
      expect(response.fileHash).to.be.not.null()
      const jobs = await UploadJob.findAll()
      expect(jobs.length).to.be.eql(1)
      const [job] = jobs
      expect(job.account).to.be.eql('testAccount')
      expect(job.peerId).to.be.eql(testApp.peerId?.id as string)
      expect(job.offerId).to.be.eql(testApp.providerAddress.toLowerCase())
      expect(job.fileHash).to.be.eql(`/ipfs/${response.fileHash}`)
      expect(job.status).to.be.eql(UploadJobStatus.WAITING_FOR_PINNING)
      expect(await isPinned(ipfs, new CID(response.fileHash))).to.be.true()

      const msg = {
        code: MessageCodesEnum.I_HASH_PINNED,
        payload: { hash: response.fileHash },
        version: 1,
        timestamp: Date.now()
      }
      await roomPinner.broadcast(msg)
      await sleep(500)

      expect(await isPinned(ipfs, new CID(response.fileHash))).to.be.false()
      expect((await UploadJob.findAll()).length).to.be.eql(0)
    })
    it('should throw on upload DDOS', async () => {
      const uploadLimitPerPeriod = config.get('uploadLimitPerPeriod')
      // @ts-ignore: Config not typed
      config.uploadLimitPerPeriod = 2

      const response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])
      expect(response.message).to.be.eql('Files uploaded')
      const response2 = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile2.txt'])
      expect(response2.message).to.be.eql('Files uploaded')
      try {
        await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile3.txt'])
      } catch (e) {
        expect(e.error.error).to.be.eql('Not allowed')
        expect(e.statusCode).to.be.eql(400)
      }

      // @ts-ignore: Config not typed
      config.uploadLimitPerPeriod = uploadLimitPerPeriod
    })
    it('should throw error if not provide file', async () => {
      try {
        await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string)
      } catch (e) {
        expect(e.error.error).to.be.eql('File needs to be provided.')
        expect(e.statusCode).to.be.eql(422)
      }
    })
    it('should throw on size limit', async () => {
      try {
        await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/bigFile.txt'])
      } catch (e) {
        expect(e.error.error).to.be.eql('File too large')
        expect(e.statusCode).to.be.eql(422)
      }
    })
    it('should throw if no required params provided', async () => {
      const missedParams = ['peerId', 'account']
      try {
        await upload(testApp.providerAddress, '', undefined, ['./test/integration/files/testFile.txt'])
      } catch (e) {
        expect(e.statusCode).to.be.eql(422)
        expect(e.error.error).to.be.eql(`Params ${missedParams} required`)
      }
    })
  })
  describe('Get file size API', () => {
    it('should be able to retrieve file size', async () => {
      const response = await upload(testApp.providerAddress, 'testAccount', testApp.peerId?.id as string, ['./test/integration/files/testFile.txt'])
      expect(response.message).to.be.eql('Files uploaded')
      expect(response.fileHash).to.be.not.null()
      const jobs = await UploadJob.findAll()
      expect(jobs.length).to.be.eql(1)
      expect(await isPinned(ipfs, new CID(response.fileHash))).to.be.true()

      const sizeRes = await getFileSize('/ipfs/' + response.fileHash)
      const sizeFromIpfs = await ipfs.object.stat!(new CID(response.fileHash))

      expect(typeof sizeRes.fileSizeBytes).to.be.eql('number')
      expect(sizeRes.fileSizeBytes).to.be.eql(sizeFromIpfs.CumulativeSize)
      expect(sizeRes.fileHash).to.be.eql('/ipfs/' + response.fileHash)

      await ipfs.pin.rm(new CID(response.fileHash))
    })
    it('should throw if no required params provided', async () => {
      const missedParams = ['hash']
      try {
        await getFileSize()
      } catch (e) {
        expect(e.statusCode).to.be.eql(422)
        expect(e.error.error).to.be.eql(`Params ${missedParams} required`)
      }
    })
  })
})
