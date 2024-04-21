import type * as Party from 'partykit/server'
import { onConnect, onMessage } from '../../src/server.js'

export default class Server implements Party.Server {
    existingDevice:string|undefined

    constructor (readonly room: Party.Room) {
        this.room = room
    }

    /**
     * Could check a token here for auth
     */
    static async onBeforeConnect (request:Party.Request) {
        // const token = new URL(request.url).searchParams.get('token') ?? ''
        // console.log('**before connection**', token)
        return request
    }

    /**
     * Parent device must connect first
     */
    onConnect (conn:Party.Connection, /* ctx:Party.ConnectionContext */) {
        onConnect(this, conn)
    }

    onMessage (message:string, sender:Party.Connection) {
        onMessage(this, message, sender)
    }
}

Server satisfies Party.Worker
