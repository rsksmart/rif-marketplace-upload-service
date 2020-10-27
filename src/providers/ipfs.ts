import ipfsClient, { CID, ClientOptions, IpfsClient, IpfsResult, Version } from 'ipfs-http-client'
import * as semver from 'semver'

import type { Provider } from '../definitions'
import { NotPinnedError } from '../errors'
import { loggingFactory } from '../logger'

const logger = loggingFactory('ipfs')

const REQUIRED_IPFS_VERSION = '>=0.5.0'
const NOT_PINNED_ERROR_MSG = 'not pinned or pinned indirectly'

export class IpfsProvider implements Provider {
  private readonly ipfs: IpfsClient

  constructor (ipfs: IpfsClient) {
    this.ipfs = ipfs
  }

  static async bootstrap (options?: ClientOptions | string): Promise<IpfsProvider> {
    if (!options) {
      // Default location of local node, lets try that one
      options = '/ip4/127.0.0.1/tcp/5001'
    }

    const ipfs = ipfsClient(options)

    let versionObject: Version
    try {
      versionObject = await ipfs.version()
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new Error(`No running IPFS daemon on ${typeof options === 'object' ? JSON.stringify(options) : options}`)
      }

      throw e
    }

    if (!semver.satisfies(versionObject.version, REQUIRED_IPFS_VERSION)) {
      throw new Error(`Supplied IPFS node is version ${versionObject.version} while this utility requires version ${REQUIRED_IPFS_VERSION}`)
    }

    return new this(ipfs)
  }

  version (): Promise<Version> {
    return this.ipfs.version()
  }

  /**
   * Upload file to IPFS
   * @param data
   * @return IpfsResult
   */
  add (data: Buffer): Promise<IpfsResult> {
    return this.ipfs.add(data)
  }

  /**
   * Remove file from IPFS
   * @param hash
   * @return void
   */
  async rm (hash: string): Promise<void> {
    hash = hash.replace('/ipfs/', '')
    const cid = new CID(hash)

    try {
      await this.ipfs.pin.rm(cid)
    } catch (e) {
      if (e.message === NOT_PINNED_ERROR_MSG) {
        throw new NotPinnedError(`${hash} is not pinned or pinned indirectly`)
      } else {
        throw e
      }
    }
  }
}
