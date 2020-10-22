import { IpfsResult } from 'ipfs-http-client'
import { Provider } from '../../../definitions'
import { IpfsProvider } from './ipfs'

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

  public async add (data: Buffer): Promise<IpfsResult> {
    if (!this.ipfs) {
      throw new Error('IPFS provider was not registered!')
    }

    return await this.ipfs.add(data)
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
}
