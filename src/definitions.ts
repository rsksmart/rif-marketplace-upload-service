import { Application as ExpressFeathers } from '@feathersjs/express'
import * as Parser from '@oclif/parser'
import { ClientOptions as IpfsOptions, IpfsObject, IpfsResult, RegularFiles } from 'ipfs-http-client'
import type { Options as Libp2pOptions } from 'libp2p'

export enum SupportedServices {
  UPLOAD = 'upload'
}

export function isSupportedServices (value: any): value is SupportedServices {
  return Object.values(SupportedServices).includes(value)
}

export enum ServiceAddresses {
  Upload = '/upload',
  FileSize = '/fileSize',
}

// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<any>;

export interface UploadService {
  precache (): Promise<void>
  purge (): Promise<void>
  initialize (app: Application): Promise<{ stop: () => Promise<void> }>
}

export interface Config {
  host?: string
  port?: number

  // DB URI to connect to database
  db?: string

  // NetworkId
  networkId?: number

  ipfs?: {
    clientOptions?: IpfsOptions
    sizeFetchTimeout?: string
  }

  gc?: {
    jobTtl?: number
  }

  // In bytes
  fileSizeLimit?: number

  log?: {
    level?: string
    filter?: string
    path?: string
  }

  upload?: {
    enabled?: boolean
  }

  comms?: {
    libp2p?: Libp2pOptions
    countOfMessagesPersistedPerAgreement?: number
  }
}

interface Args {[name: string]: any}

type Options<T> = T extends Parser.Input<infer R>
  ? Parser.Output<R, Args>
  : any

export type Flags<T> = Options<T>['flags']

/**
 * Basic logger interface used around the application.
 */
export interface Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  critical (message: string | Error | object, ...meta: any[]): never

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error (message: string | Error | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn (message: string | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info (message: string | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verbose (message: string | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug (message: string | object, ...meta: any[]): void
}

/****************************************************************************************
 * Communications
 */

export enum MessageCodesEnum {
  I_HASH_PINNED = 'I_HASH_STOP',
  I_HASH_START = 'I_HASH_START',
  E_AGREEMENT_SIZE_LIMIT_EXCEEDED = 'E_AGR_SIZE_OVERFLOW',
  E_GENERAL = 'E_GEN',
  W_HASH_RETRY = 'W_HASH_RETRY'
}

interface BasePayload {
  agreementReference: string
}

export interface RetryPayload extends BasePayload {
  error: string
  retryNumber: number
  totalRetries: number
}

export interface HashInfoPayload extends BasePayload {
  hash: string
}

export type AgreementInfoPayload = BasePayload

export interface AgreementSizeExceededPayload extends BasePayload {
  hash: string
  size: number
  expectedSize: number
}

// Incoming messages

export interface CommsMessage<Payload> {
  timestamp: number
  version: number
  code: string
  payload: Payload
}

export type CommsPayloads = AgreementSizeExceededPayload | AgreementInfoPayload | HashInfoPayload | RetryPayload

export type MessageHandler = (message: CommsMessage<CommsPayloads>) => Promise<void>

// Storage Provider

export interface Provider {
  add (data: Buffer | Array<IpfsObject<any>>, options: RegularFiles.AddOptions): Promise<IpfsResult>
  rm (hash: string): void
}

export enum UploadJobStatus {
  UPLOADING = 'UPLOADING',
  WAITING_FOR_PINNING = 'WAITING_FOR_PINNING'
}
