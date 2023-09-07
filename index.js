/* eslint-disable no-console */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { delegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { ipniContentRouting } from '@libp2p/ipni-content-routing'
import { tcp } from '@libp2p/tcp'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { createHelia } from 'helia'
import { create as kuboClient } from 'kubo-rpc-client'
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'
import { kadDHT } from '@libp2p/kad-dht'


async function createNode (client, port) {
  // the blockstore is where we store the blocks that make up files
  const blockstore = new MemoryBlockstore()

  // application-specific data lives in the datastore
  const datastore = new MemoryDatastore()

  // libp2p is the networking layer that underpins Helia
  const libp2p = await createLibp2p({
    datastore,
    addresses: {
      listen: [
        `/ip4/127.0.0.1/tcp/${port}`
      ],
      announce: [
        `/ip4/127.0.0.1/tcp/${port}`
      ],
    },
    transports: [
      tcp()
    ],
    connectionEncryption: [
      noise()
    ],
    contentRouters: [ipniContentRouting('https://cid.contact')],
    streamMuxers: [
      yamux()
    ],
    peerRouters: [
      delegatedPeerRouting(client)
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
        ]
      })
    ],
    services: {
      identify: identifyService(),
      dht: kadDHT({
        clientMode: true
      })
    }
  })

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}

const kuboRPCClient = kuboClient('/ip4/127.0.0.1/tcp/5001')

// create two libp2p nodes
const node1 = await createNode(kuboRPCClient, 4001)
const node2 = await createNode(kuboRPCClient, 4002)

console.log('Node 1 peerID', node1.libp2p.peerId.toString() + ' multiaddr: ', node1.libp2p.getMultiaddrs().toString())
console.log('Node 2 peerID', node2.libp2p.peerId.toString() + ' multiaddr: ', node2.libp2p.getMultiaddrs().toString())

const peerInfo = await node1.libp2p.peerRouting.findPeer(node2.libp2p.peerId)

console.log('peer info:', peerInfo)
