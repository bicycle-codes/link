import type { DID, Crypto } from '@bicycle-codes/identity'
import { concat, toString } from 'uint8arrays'

const BASE58_DID_PREFIX = 'did:key:z'

export async function writeKeyToDid (
    crypto:Crypto
):Promise<DID> {
    const [pubKey, ksAlg] = await Promise.all([
        crypto.keystore.publicWriteKey(),
        crypto.keystore.getAlgorithm()
    ])

    return publicKeyToDid(crypto, pubKey, ksAlg)
}

export function publicKeyToDid (
    crypto:Crypto,
    publicKey:Uint8Array,
    keyType:string
):DID {
    // Prefix public-write key
    const prefix = crypto.did.keyTypes[keyType]?.magicBytes
    if (prefix === null) {
        throw new Error(`Key type '${keyType}' not supported, ` +
            `available types: ${Object.keys(crypto.did.keyTypes).join(', ')}`)
    }

    const prefixedBuf = concat([prefix, publicKey])

    // Encode prefixed
    return (BASE58_DID_PREFIX + toString(prefixedBuf, 'base58btc')) as DID
}
