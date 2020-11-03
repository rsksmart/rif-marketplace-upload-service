# RIF Marketplace Upload Service

[![CircleCI](https://flat.badgen.net/circleci/github/rsksmart/rif-marketplace-cache/master)](https://circleci.com/gh/rsksmart/rif-marketplace-cache/)
[![Dependency Status](https://david-dm.org/rsksmart/rif-marketplace-cache.svg?style=flat-square)](https://david-dm.org/rsksmart/rif-marketplace-cache)
[![](https://img.shields.io/badge/made%20by-IOVLabs-blue.svg?style=flat-square)](http://iovlabs.org)
[![](https://img.shields.io/badge/project-RIF%20Marketplace-blue.svg?style=flat-square)](https://www.rifos.org/)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![Managed by tAsEgir](https://img.shields.io/badge/%20managed%20by-tasegir-brightgreen?style=flat-square)](https://github.com/auhau/tasegir)
![](https://img.shields.io/badge/npm-%3E%3D6.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D10.0.0-orange.svg?style=flat-square)

> API server that caches different metrics from blockchain across RIF services

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

This is a backend service for uploading files to IPFS which communicate with pinners using libp2p
It is build using [FeathersJS](https://www.feathersjs.com)

## API

### Upload 

This api allow you to upload file

#### Offers endpoint

```
POST: /upload

MultiPartFormData: {
  file: Buffer,
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
file and load that either using the `--config` CLI parameter or using environment variable `RIFM_CONFIG`.

### Environment variables overview

 - `RIFMUS_PORT` (number): port on which the server should listen to
 - `RIFMUS_DB` (string): database connection URI
 - CORS settings ([see more on expressjs documentation](https://expressjs.com/en/resources/middleware/cors.html)):
    - `RIFMUS_CORS_ORIGIN` (boolean | string | regexp): Configures the Access-Control-Allow-Origin CORS header
    - `RIFMUS_CORS_METHODS` (string) Configures the Access-Control-Allow-Methods CORS header
 - Logging related (see bellow):
    - `LOG_LEVEL` (string)
    - `LOG_FILTER` (string)
    - `LOG_PATH` (string)

## Usage

```sh-session
$ npm install -g @rsksmart/rif-marketplace-cache

// Connection to your database
$ export RIFM_DB=postgres://user:pass@localhost/db

// Sync the schema of database
$ rif-marketplace-cache db-sync

// Connection to your blockchain provider
$ export RIFM_PROVIDER=ws://localhost:8545

// Prefetch all the data from the network
$ rif-marketplace-cache precache all

// Start the server
$ rif-marketplace-cache start --port 8000

// Start the server listening for testnet configuration
$ NODE_ENV=rsktestnet rif-marketplace-cache start --port 8000
```

For some more details on how to deploy this server please see [Deployment guide](./DEPLOYMENT.md).

### Commands
<!-- commands -->
* [`rif-marketplace-cache db-sync`](#rif-marketplace-cache-db-sync)
* [`rif-marketplace-cache precache [SERVICE]`](#rif-marketplace-cache-precache-service)
* [`rif-marketplace-cache purge [SERVICE]`](#rif-marketplace-cache-purge-service)
* [`rif-marketplace-cache start`](#rif-marketplace-cache-start)

#### `rif-marketplace-cache db-sync`

synchronize database schema

```
USAGE
  $ rif-marketplace-cache db-sync

OPTIONS
  --config=config              path to JSON config file to load
  --db=db                      database connection URI
  --force                      removes all tables and recreates them
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT
```

#### `rif-marketplace-cache precache [SERVICE]`

precache past data for a service

```
USAGE
  $ rif-marketplace-cache precache [SERVICE]

OPTIONS
  --config=config              path to JSON config file to load
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT

DESCRIPTION
  Command will fetch data from blockchain and process them prior turning on the API server.
  Currently supported services:
    - all
    - storage
    - rns
    - rates

EXAMPLES
  $ rif-marketplace-cache precache all
  $ rif-marketplace-cache precache storage rns
```

#### `rif-marketplace-cache purge [SERVICE]`

purge cached data

```
USAGE
  $ rif-marketplace-cache purge [SERVICE]

OPTIONS
  --config=config              path to JSON config file to load
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT

DESCRIPTION
  Can purge all data or for specific service.
  Currently supported services:
    - all
    - storage
    - rns
    - rates

EXAMPLES
  $ rif-marketplace-cache purge all
  $ rif-marketplace-cache purge storage rns
```

#### `rif-marketplace-cache start`

start the caching server

```
USAGE
  $ rif-marketplace-cache start

OPTIONS
  -d, --disable=disable        disable specific service
  -e, --enable=enable          enable specific service
  -p, --port=port              port to attach the server to
  --config=config              path to JSON config file to load
  --db=db                      database connection URI
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT
  --provider=provider          blockchain provider connection URI

DESCRIPTION
  Currently supported services:
    - storage
    - rns
    - rates

EXAMPLE
  $ rif-marketplace-cache start --disable service1 --disable service2 --enable service3
```
<!-- commandsstop -->

## License

[MIT](./LICENSE)
