import config from 'config'
import { IpfsObject, IpfsResult, Version, RegularFiles } from 'ipfs-http-client'

import { Application, Provider } from '../definitions'
import { loggingFactory } from '../logger'
import { duplicateObject } from '../utils'
import { IpfsProvider } from './ipfs'

const logger = loggingFactory('storage-provider')

/**
 * Provider which redirects the pin/unpin requests to the correct provider
 * based on the structure of the hash.
 */
export class ProviderManager implements Provider {
  private ipfs?: IpfsProvider

  public register (provider: Provider): void {
    if (provider instanceof IpfsProvider) {
      this.ipfs = provider
    }
  }

  public version (): Promise<Version> {
    if (!this.ipfs) {
      throw new Error('IPFS provider was not registered!')
    }

    try {
      return this.ipfs.version()
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new Error('No running IPFS daemon')
      }

      throw e
    }
  }

  public async add (data: Buffer | Array<IpfsObject<any>>, options: RegularFiles.AddOptions): Promise<IpfsResult> {
    if (!this.ipfs) {
      throw new Error('IPFS provider was not registered!')
    }

    return await this.ipfs.add(data, options)
  }

  public async rm (hash: string): Promise<void> {
    if (hash.startsWith('/ipfs/')) {
      if (!this.ipfs) {
        throw new Error('IPFS provider was not registered!')
      }

      await this.ipfs.rm(hash)
    } else {
      throw new Error(`Unknown type of hash ${hash}`)
    }
  }

  public getMetaFileSize (hash: string): Promise<number> {
    if (hash.startsWith('/ipfs/')) {
      if (!this.ipfs) {
        throw new Error('IPFS provider was not registered!')
      }

      return this.ipfs.getMetaSize(hash)
    } else {
      throw new Error(`Unknown type of hash ${hash}`)
    }
  }
}

async function initIpfs (app: Application) {
  const ipfs = await IpfsProvider.bootstrap(duplicateObject(config.get<string>('ipfs.clientOptions')))
  app.get('storage').register(ipfs)
  logger.info('IPFS provider initialized')
}

export default function (app: Application): void {
  app.set('storage', new ProviderManager())
  app.set('ipfsInit', initIpfs(app))
}
