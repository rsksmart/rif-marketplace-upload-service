# RIF Marketplace Upload Service

[![CircleCI](https://flat.badgen.net/circleci/github/rsksmart/rif-marketplace-upload-service/master)](https://circleci.com/gh/rsksmart/rif-marketplace-upload-service/)
[![Dependency Status](https://david-dm.org/rsksmart/rif-marketplace-upload-service.svg?style=flat-square)](https://david-dm.org/rsksmart/rif-marketplace-upload-service)
[![](https://img.shields.io/badge/made%20by-IOVLabs-blue.svg?style=flat-square)](http://iovlabs.org)
[![](https://img.shields.io/badge/project-RIF%20Marketplace-blue.svg?style=flat-square)](https://www.rifos.org/)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![Managed by tAsEgir](https://img.shields.io/badge/%20managed%20by-tasegir-brightgreen?style=flat-square)](https://github.com/auhau/tasegir)
![](https://img.shields.io/badge/npm-%3E%3D6.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D10.0.0-orange.svg?style=flat-square)

> Service that allow to upload file to IPFS 

**Warning: This project is in alpha state. There might (and most probably will) be changes in the future to its API and working. Also, no guarantees can be made about its stability, efficiency, and security at this stage.**

## Table of Contents

- [Introduction](#introduction)
- [API](#supported-services)
- [Configuration](#configuration)
    - [Environment variables overview](#environment-variables-overview)
- [Usage](#usage)
    - [Commands](#commands)
- [License](#license)

## Introduction

This is a backend service for uploading files to IPFS which communicate with pinners using libp2p.
It is build using [FeathersJS](https://www.feathersjs.com)

## API

### Upload 

This api allow you to upload file

#### Offers endpoint

```
POST: /upload

MultiPartFormData: {
  file: File,
  account: string,
  offerId: string,
  peerId: string
}
```


```json5
{
  message: 'File uploaded',
  fileHash: 'Qmasv234cksldmfFileHash'
}
```
## Configuration

Required reading: [node-config docs](https://github.com/lorenwest/node-config/wiki/Configuration-Files)

There are several ways how to configure this application:

 1. Using JSON file
 1. Using Environmental variables
 1. Using CLI parameters

To run this upload service there is minimum configuration needed, which is supported with all the configuration ways mentioned above:

 - Database connection
 - Storage provider connection (IPFS)
 - Libp2p bootstrap nodes list
 
For general overview of complete configuration options see [Config interface](https://github.com/rsksmart/rif-marketplace-upload-service/blob/master/src/definitions.ts)
that describe configuration object's properties. If you need advanced configuration you can build your own JSON configuration
file and load that either using the `--config` CLI parameter or using environment variable `RIFMUS_CONFIG`.

### Environment variables overview

 - `RIFMUS_PORT` (number): port on which the server should listen to
 - `RIFMUS_DB` (string): database connection URI
 - `RIFMUS_NETWORK_ID` (number): network id
 - `RIFMUS_IPFS_URL` (string): IPFS Node url
 - CORS settings ([see more on expressjs documentation](https://expressjs.com/en/resources/middleware/cors.html)):
    - `RIFMUS_CORS_ORIGIN` (boolean | string | regexp): Configures the Access-Control-Allow-Origin CORS header
    - `RIFMUS_CORS_METHODS` (string) Configures the Access-Control-Allow-Methods CORS header
 - Logging related (see bellow):
    - `LOG_LEVEL` (string)
    - `LOG_FILTER` (string)
    - `LOG_PATH` (string)

## Usage

```sh-session
$ npm install -g @rsksmart/rif-marketplace-upload-service

// Connection to your database
$ export RIFMUS_DB=myDbDile.sqlite

// Sync the schema of database
$ rif-storage-upload-service db-sync

// Start the server
$ rif-storage-upload-service start --port 8000
```

For some more details on how to deploy this server please see [Deployment guide](./DEPLOYMENT.md).

### Commands
<!-- commands -->
* [`rif-storage-upload-service db-sync`](#rif-storage-upload-service-db-sync)
* [`rif-storage-upload-service purge [SERVICE]`](#rif-storage-upload-service-purge)
* [`rif-storage-upload-service start`](#rif-storage-upload-service-start)

#### `rif-marketplace-cache db-sync`

synchronize database schema

```
USAGE
  $ rif-storage-upload-service db-sync

OPTIONS
  --config=config                      path to JSON config file to load
  --db=db                              database connection URI
  --force                              removes all tables and recreates them
  --log=error|warn|info|verbose|debug  [default: warn] what level of information to log
  --log-filter=log-filter              what components should be logged (+-, chars allowed)
  --log-path=log-path                  log to file, default is STDOUT

```


#### `rif-storage-upload-service purge`

purge cached data

```
USAGE
  $ rif-storage-upload-service purge

OPTIONS
  --config=config                      path to JSON config file to load
  --log=error|warn|info|verbose|debug  [default: warn] what level of information to log
  --log-filter=log-filter              what components should be logged (+-, chars allowed)
  --log-path=log-path                  log to file, default is STDOUT

EXAMPLE
  $ rif-storage-upload-service purge
```

#### `rif-storage-upload-service start`

start the upload service

```
USAGE
  $ rif-storage-upload-service start

OPTIONS
  -p, --port=port                      port to attach the server to
  --config=config                      path to JSON config file to load
  --db=db                              database connection URI
  --log=error|warn|info|verbose|debug  [default: warn] what level of information to log
  --log-filter=log-filter              what components should be logged (+-, chars allowed)
  --log-path=log-path                  log to file, default is STDOUT

EXAMPLE
  $ rif-storage-upload-service start
```
<!-- commandsstop -->

## License

[MIT](./LICENSE)
