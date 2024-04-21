import { test } from '@bicycle-codes/tapzero'
import {
    create as createID,
    writeKeyToDid,
} from '@bicycle-codes/identity'
import { verify } from '@bicycle-codes/message'
import { Parent, Child, Certificate } from '../src/index.js'
import { Implementation } from '@oddjs/odd/lib/components/crypto/implementation'

const odd = globalThis.webnative
const createProgram = odd.program

const HOST_URL = 'localhost:1999'

let _certificate:Certificate|undefined
let _aliceComputerCrypto:Implementation
let _alicesCrypto:Implementation

test('link 2 devices', async t => {
    t.plan(5)

    const alicesProgram = await createProgram({
        namespace: {
            name: 'link-tests',
            creator: 'tests'
        }
    })
    const { crypto: alicesCrypto } = alicesProgram.components
    _alicesCrypto = alicesCrypto
    const alice = await createID(alicesCrypto, {
        humanName: 'alice',
        humanReadableDeviceName: 'phone'
    })

    const alicesComputersProgram = await createProgram({
        namespace: {
            name: 'link-tests',
            creator: 'tests-device-2'
        }
    })

    const { crypto: alicesComputersCrypto } = alicesComputersProgram.components
    _aliceComputerCrypto = alicesComputersCrypto

    // parent must be called first
    Parent(alice, alicesCrypto, {
        host: HOST_URL,
        code: '1234'
    }).then(newId => {
        t.ok(newId, 'parent gets a new identity')
    })

    const { identity: childsID, certificate } = await Child(
        alicesComputersCrypto,
        {
            host: HOST_URL,
            code: '1234',
            humanReadableDeviceName: 'computer'
        }
    )

    _certificate = certificate

    t.ok(childsID, 'child gets a new identity')
    t.ok(certificate, 'child gets a certificate')

    t.equal(alice.username, childsID.username,
        'Both IDs should have the same username')

    t.ok(Object.keys(alice.devices).every(deviceName => {
        return childsID.devices[deviceName]
    }), 'devices should be equal in both IDs')
})

test('the certificate', async t => {
    t.equal(_certificate?.recipient, await writeKeyToDid(_aliceComputerCrypto),
        'should create a certificate for the new device')
    t.ok(await verify(_certificate!), 'the cerificate should be valid')
    t.equal(_certificate?.author, await writeKeyToDid(_alicesCrypto),
        "the certificate should be signed by alice's original machine")
})
