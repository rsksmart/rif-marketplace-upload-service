#!/usr/bin/env bash

path="$(dirname "$0")/.repos"

mkdir -p $path

export IPFS_PATH="$path/upload"
ipfs init
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5002
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8081
ipfs config --json Addresses.Swarm '["/ip4/0.0.0.0/tcp/4002", "/ip6/::/tcp/4002", "/ip4/0.0.0.0/udp/4002/quic", "/ip6/::/udp/4002/quic"]'
