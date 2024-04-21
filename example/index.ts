import { html } from 'htm/preact'
import { render, FunctionComponent } from 'preact'
import { signal, useSignal, useComputed, batch } from '@preact/signals'
import { ButtonOutline } from '@nichoth/components/htm/button-outline'
import { Identity, create as createID } from '@bicycle-codes/identity'
import { program as Program } from '@oddjs/odd'
import { Button } from '@nichoth/components/htm/button'
import Debug from '@nichoth/debug'
import { TextInput } from '@nichoth/components/htm/text-input'
import { customAlphabet } from '@nichoth/nanoid'
import { numbers } from '@nichoth/nanoid-dictionary'
import { Parent, Child, Certificate } from '../src/index.js'
import '@nichoth/components/button-outline.css'
import '@nichoth/components/text-input.css'
import '@nichoth/components/button.css'
import './style.css'
const debug = Debug()

const program = await Program({
    namespace: {
        name: 'link-example',
        creator: 'bicycle-computing'
    }
})

const { crypto } = program.components

const state = {
    me: signal<Identity|null>(null),
    linkState: signal<'parent'|'child'|null>(null),
    code: signal<string|null>(null),
    certificate: signal<Certificate|null>(null)
}

if (import.meta.env.DEV) {
    // @ts-expect-error dev
    window.state = state
}

const PARTY_URL = (import.meta.env.DEV ?
    'localhost:1999' :
    'link.nichoth.partykit.dev')

const Example:FunctionComponent = function Example () {
    async function addChild (ev) {
        ev.preventDefault()
        debug('add a child device', ev)
        // the parent needs to create a random ID for websocket connection
        const code = customAlphabet(numbers, 6)()

        batch(() => {
            state.linkState.value = 'parent'
            state.code.value = '' + code
        })

        /**
         * connect to our server
         * `identity` will be the new ID, including the child device
         */
        const identity = await Parent(state.me.value!, crypto, {
            host: PARTY_URL,
            code: '' + code
        })

        state.me.value = identity
    }

    async function createId (ev) {
        ev.preventDefault()
        const deviceName = ev.target.elements.deviceName.value
        const humanName = ev.target.elements.humanName.value
        if (!deviceName) return
        debug('device name', deviceName)
        const me = await createID(crypto, {
            humanName,
            humanReadableDeviceName: deviceName
        })

        state.me.value = me
    }

    function connectToParent (ev) {
        ev.preventDefault()
        state.linkState.value = 'child'
        debug('connect to parent...', ev)
    }

    async function joinParent ({ code, humanReadableDeviceName }) {
        const { identity, certificate } = await Child(crypto, {
            host: PARTY_URL,
            code,
            humanReadableDeviceName
        })

        batch(() => {
            state.me.value = identity
            state.certificate.value = certificate
        })
    }

    return html`<div class="link-demo">
        ${state.me.value ?
            html`<div class="my-id">
                <p>This is your ID:</p>
                <pre>
                    ${JSON.stringify(state.me.value, null, 2)}
                </pre>

                ${state.linkState.value === null ?
                    html`<div class="connectors">
                        <${ButtonOutline} onClick=${addChild}>
                            Add a child device
                        <//>
                        <${ButtonOutline} onClick=${connectToParent}>
                            Connect to a parent device
                        <//>
                    </div>` :
                    null
                }
            </div>

            ${state.linkState.value === 'parent' ?
                html`<div class="the-pin">
                    <p>
                        The code (enter this on the new device):
                    </p>
                    <span class="the-code">${state.code.value}</span>
                </div>` :
                null
            }` :

            html`<form onSubmit=${createId}>
                <${TextInput}
                    required
                    name=${'deviceName'}
                    displayName=${"This device's name"}
                />

                <${TextInput}
                    required
                    name=${'humanName'}
                    displayName=${'Your human name'}
                />

                <${Button} type=${'submit'}>Save<//>
            </form>`
        }
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)

/**
 * The form to enter a code
 * (from a new child device)
 */
function CodeForm ({ onSubmit }) {
    const isValidPin = useSignal<boolean>(false)
    const isSpinning = useSignal<boolean>(false)
    const isNameValid = useSignal<boolean>(false)
    const isFormValid = useComputed(() => {
        return isValidPin.value && isNameValid.value
    })

    // need this because `onInput` event doesnt work for cmd + delete event
    function onFormKeydown (ev:KeyboardEvent) {
        const key = ev.key
        const { form } = ev.target as HTMLInputElement
        if (!form) return
        if (key !== 'Backspace' && key !== 'Delete') return

        const _isValid = form.checkValidity()
        if (_isValid !== isValidPin.value) isValidPin.value = _isValid
    }

    async function handleSubmit (ev:SubmitEvent) {
        ev.preventDefault()

        const pin = (ev.target as HTMLFormElement).elements['pin'].value
        const nameEl = (ev.target as HTMLFormElement).elements['device-name']
        const humanReadableDeviceName = nameEl.value

        onSubmit({
            code: pin,
            humanReadableDeviceName
        })
    }

    function pinInput (ev:InputEvent) {
        const el = ev.target as HTMLInputElement
        el.value = '' + el.value.slice(0, parseInt(el.getAttribute('maxlength')!))
        const max = parseInt(el.getAttribute('maxlength')!)
        const min = parseInt(el.getAttribute('minlength')!)
        const valid = (el.value.length >= min && el.value.length <= max)
        if (valid !== isValidPin.value) isValidPin.value = valid
    }

    function onNameInput (ev:InputEvent) {
        const isValid = (ev.target as HTMLInputElement).checkValidity()
        if (!!isValid !== isNameValid.value) isNameValid.value = !!isValid
    }

    return html`<form
        class="pin-form"
        onKeyDown=${onFormKeydown}
        onSubmit=${handleSubmit}
    >
        <div>
            <label>
                Choose a name for this device
                <${TextInput}
                    onChange=${onNameInput}
                    onInput=${onNameInput}
                    displayName="Device name"
                    required=${true}
                    minlength=${3}
                    name="device-name"
                />
            </label>
        </div>

        <p>Enter the PIN from the parent device</p>
        <div class="pin-input">
            <input name="pin" className="pin" type="number"
                minlength=${6}
                maxlength=${6}
                autoComplete="off"
                inputMode="numeric"
                required=${true}
                id="pin-input"
                onInput=${pinInput}
            />
        </div>

        <${Button}
            isSpinning=${isSpinning}
            disabled=${!isFormValid.value}
            type="submit"
        >
            Link devices
        <//>
    </form>`
}
