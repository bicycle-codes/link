import { html } from 'htm/preact'
import { render } from 'preact'

example()

const PARTY_URL = (import.meta.env.DEV ?
    'localhost:1999' :
    'link.nichoth.partykit.dev')

function Example () {
    return html`<div>hello</div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
