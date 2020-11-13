# RIF Marketplace Upload service Deployment guide

This is example for RSK testnet deployment.

## Configuration

The Upload service needs configuration to work properly. Based on the custom settings you want to configure you either can use:

 1. environmental variables - only some options are available. See overview [here](./README.md#environment-variables-overview).
 2. custom config

For a custom config create JSON file which follows scheme defined [here](./src/definitions.ts).

## Using Docker

The easiest way is to mount the config directly into the Docker container.

```
$ git clone https://github.com/rsksmart/rif-marketplace-upload-service.git
$ cd ./rif-marketplace-upload-service
$ docker build -t rif-marketplace-upload-service .
$ docker run -v <path-to-the-config>:/srv/app/config/local.json5 -id rif-marketplace-upload-service --config local
```

## UNIX environment

### Prerequisites

 - Node v10 or 12
 - RSKj node to connect to (a.k.a provider)

### Steps

#### 1. Install

Install the Upload service NPM package

```
npm install -g @rsksmart/rif-marketplace-upload-service
```

#### 2. Run the Cache

**Change path to your Custom Config in following commands**

First synchronize database scheme:

```bash
$ rif-marketplace-upload-service db-migration --up --config ./path/to/custom_config
```

Finally, run the server:

```bash
$ rif-marketplace-upload-service start --config ./path/to/custom_config
```
