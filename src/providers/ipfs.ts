import ipfsClient, {
  CID,
  ClientOptions,
  IpfsClient,
  IpfsObject,
  IpfsResult,
  RegularFiles,
  Version
} from 'ipfs-http-client'
import * as semver from 'semver'
import fetch, { RequestInit } from 'node-fetch'

import type { Provider } from '../definitions'
import { NotPinnedError } from '../errors'
import { loggingFactory } from '../logger'

const logger = loggingFactory('ipfs')

const REQUIRED_IPFS_VERSION = '>=0.7.0'
const NOT_PINNED_ERROR_MSG = 'not pinned or pinned indirectly'

export function getDagStat (
  nodeUrl: string
): (cid: CID, options?: any) => Promise<{ Size: number }> {
  return (cid: CID, options?: RequestInit): Promise<{ Size: number }> =>
    fetch(`${nodeUrl}/dag/stat?arg=${cid.toString()}`, { method: 'POST', ...options })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Get dag stat for hash ${cid.toString()} error, ${res.statusText}`)
        }
        return (await res.text())
          .split('\n')
          .filter(el => el)
          .map(el => JSON.parse(el))
          .reduce((acc, el) => el.NumBlocks > acc.NumBlocks ? el : acc)
      })
}

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
    // TODO remove when this API officially supported
    ipfs.dag = { stat: getDagStat(typeof options === 'string' ? options : options.url as string) }

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
   * @param options
   * @return IpfsResult
   */
  add (data: Buffer | Array<IpfsObject<any>>, options: RegularFiles.AddOptions): Promise<IpfsResult> {
    return this.ipfs.add(data, options)
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

  getActualSize (hash: string): Promise<number> {
    hash = hash.replace('/ipfs/', '')
    const cid = new CID(hash)

    return this.ipfs.dag.stat!(cid).then(res => res.Size)
  }

  getMetaSize (hash: string): Promise<number> {
    hash = hash.replace('/ipfs/', '')
    const cid = new CID(hash)

    return this.ipfs.object.stat(cid).then(res => res.CumulativeSize)
  }
}
