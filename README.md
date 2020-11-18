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

## Lead Maintainer

[Nazar Duchak](https://github.com/nduchak)

See what "Lead Maintainer" means [here](https://github.com/rsksmart/lead-maintainer).

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
  files: File1,
  files: File2,
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
 - `RIFMUS_COMMS_LISTEN` (`array`) - Defines an array of multiaddress that the Upload service libp2p node will listen on. Same as libp2p config's [`address.listen`](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-libp2p) property.
 - `RIFMUS_COMMS_BOOTSTRAP_ENABLED` (`true`/`false`) - Defines if bootstrap should be used. Same as libp2p config's [`bootstrap.enabled`](https://github.com/libp2p/js-libp2p-bootstrap) property.
 - `RIFMUS_COMMS_BOOTSTRAP_LIST` (`array`) - Defines an array of multiaddress that the Upload service libp2p node will use to bootstrap its connectivity. Same as libp2p config's [`bootstrap.list`](https://github.com/libp2p/js-libp2p-bootstrap) property.
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
$ export RIFMUS_DB=myDbFile.sqlite

// Database migrations
$ rif-marketplace-upload-service db-migration --up

// Start the server
$ rif-marketplace-upload-service start --port 8000
```

### Commands
<!-- commands -->
* [`rif-marketplace-upload-service db-migration`](#rif-marketplace-upload-service-db-migration)
* [`rif-marketplace-upload-service purge [SERVICE]`](#rif-marketplace-upload-service-purge)
* [`rif-marketplace-upload-service start`](#rif-marketplace-upload-service-start)

#### `rif-marketplace-cache db-migration`

migrate database schema

```
USAGE
  $ rif-marketplace-upload-service db-migration

OPTIONS
  -d, --down                           Undo db migrations
  -d, --generate=generate              Generate migrations using template [--generate=migration_name]
  -m, --migration=migration            Migration file
  -t, --to=to                          Migrate to
  -u, --up                             Migrate DB
  --config=config                      path to JSON config file to load
  --db=db                              database connection URI
  --log=error|warn|info|verbose|debug  [default: info] what level of information to log
  --log-filter=log-filter              what components should be logged (+-, chars allowed)
  --log-path=log-path                  log to file, default is STDOUT

EXAMPLES
  $ rif-marketplace-upload-service db-migration --up
  $ rif-marketplace-upload-service db-migration --down
  $ rif-marketplace-upload-service db-migration --up --to 0-test
  $ rif-marketplace-upload-service db-migration --up --migrations 01-test --migrations 02-test
  $ rif-marketplace-upload-service db-migration --up --db ./test.sqlite --to 09-test
  $ rif-marketplace-upload-service db-migration --down --db ./test.sqlite --to 09-test
  $ rif-marketplace-upload-service db-migration --generate my_first_migration

```


#### `rif-marketplace-upload-service purge`

purge cached data

```
USAGE
  $ rif-marketplace-upload-service purge

OPTIONS
  --config=config                      path to JSON config file to load
  --log=error|warn|info|verbose|debug  [default: warn] what level of information to log
  --log-filter=log-filter              what components should be logged (+-, chars allowed)
  --log-path=log-path                  log to file, default is STDOUT

EXAMPLE
  $ rif-marketplace-upload-service purge
```

#### `rif-marketplace-upload-service start`

start the upload service

```
USAGE
  $ rif-marketplace-upload-service start

OPTIONS
  -p, --port=port                      port to attach the server to
  --config=config                      path to JSON config file to load
  --db=db                              database connection URI
  --log=error|warn|info|verbose|debug  [default: warn] what level of information to log
  --log-filter=log-filter              what components should be logged (+-, chars allowed)
  --log-path=log-path                  log to file, default is STDOUT

EXAMPLE
  $ rif-marketplace-upload-service start
```
<!-- commandsstop -->

## License

[MIT](./LICENSE)
