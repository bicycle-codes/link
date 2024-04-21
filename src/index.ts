import { PartySocket } from 'partysocket'
import { toString } from 'uint8arrays'
import { create as createMessage } from '@bicycle-codes/message'
import {
    writeKeyToDid,
    addDevice,
    createDeviceName
} from '@bicycle-codes/identity'
import type { DID, Crypto, Identity } from '@bicycle-codes/identity'

/**
 * Message from the new, incoming, device
 */
export type NewDeviceMessage = {
    newDid:`did:key:z${string}`;  // <-- DID for the new device
    deviceName:string;  // <-- the auto generated random string
    exchangeKey:string;
    humanReadableDeviceName:string;  // <-- a name for the new device
}

/**
 * The certificate is a signed message from the "parent" device,
 * saying that the new device is authorized.
 */
export type Certificate = Awaited<
    ReturnType<typeof createMessage<{
        exp?:number;  /* <-- Expiration, unix timestamp,
            after which this certificat is no longer valid.
            Default is no expiration. */
        nbf?:number  /* <-- Not Before, unix timestamp of when the certificate
            becomes valid. */
        recipient:DID  // <-- DID of who this certificate is intended for
    }>>
>

/**
 * Open a websocket channel that the new device should connect to.
 *
 * @param {Identity} identity The existing identity
 * @param {Crypto} oddCrypto A Crypto implementation from `odd`
 * @param {Object} opts Host, crypto, and a code for the websocket
 * @param {Crypto} opts.oddCrypto An instance of odd crypto
 * @param {string} opts.host The address for your websocket
 * @param {string} opts.code A unique ID for the websocket connection. Should
 * be transmitted out of band to the new device.
 * @returns {Promise<Identity>} A promise that will resolve with a new identity
 * instance that includes the new device, after we get a message from the
 * new device.
 */
export function Parent (identity:Identity, oddCrypto:Crypto, {
    host,
    code,
    id,
    query
}:{
    host:string;
    code:string;
    id?:string;
    query?:string;
}):Promise<Identity> {
    const party = new PartySocket({
        host,
        room: code,
        id,
        query: {
            token: query
        }
    })

    return new Promise((resolve, reject) => {
        party.addEventListener('message', async ev => {
            let msg:NewDeviceMessage
            let newDid:DID, exchangeKey:string, humanReadableDeviceName:string

            try {
                msg = JSON.parse(ev.data);
                ({
                    newDid,
                    exchangeKey,
                    humanReadableDeviceName
                } = msg)
            } catch (err) {
                return reject(err)
            }

            const newIdentity = await addDevice(
                identity,
                oddCrypto,
                newDid,
                exchangeKey,
                humanReadableDeviceName
            )

            const certificate:Certificate = await createMessage<{
                recipient:DID
            }>(
                oddCrypto,
                { recipient: newDid }
            )

            party.send(JSON.stringify({
                newIdentity,
                certificate
            }))

            resolve(newIdentity)

            // we are done now
            party.close()
        })
    })
}

export async function Child (oddCrypto:Crypto, {
    host,
    code,
    query,
    humanReadableDeviceName
}:{
    host:string;
    code:string;
    query?:string;
    humanReadableDeviceName:string;
}) {
    const party = new PartySocket({
        host,
        room: code,
        query: { token: query },
    })

    const newDid = await writeKeyToDid(oddCrypto)
    const deviceName = await createDeviceName(newDid)

    /**
     * Send our DID to the existing device
     */
    party.send(JSON.stringify({
        deviceName,
        humanReadableDeviceName,
        newDid: await writeKeyToDid(oddCrypto),
        exchangeKey: toString(
            await oddCrypto.keystore.publicExchangeKey()
        )
    }))

    return new Promise((resolve, reject) => {
        /**
         * We should only get 1 message,
         * containing the new identity that includes this device,
         * and the certificate that authorizes this device
         */
        party.addEventListener('message', async (ev) => {
            let newIdentity:Identity, certificate:Certificate
            try {
                ({ newIdentity, certificate } = JSON.parse(ev.data))
            } catch (err) {
                return reject(err)
            }

            resolve({ newIdentity, certificate })
        })
    })
}
