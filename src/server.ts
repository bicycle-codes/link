import * as Party from 'partykit/server'

export function onConnect (
    party:Party.Server & { existingDevice:string|undefined },
    conn:Party.Connection
) {
    if (!party.existingDevice) {
        // That means this is a new room. The first connection should be
        //   the parent device
        party.existingDevice = conn.id  // we use the DID as the id
    }
}

export function onMessage (
    party:Party.Server & { existingDevice:string|undefined, room:Party.Room },
    message:string,
    sender:Party.Connection
) {
    if (!party.existingDevice) {
        // Should not happen.
        throw new Error('Got a message before an existing device connected')
    }

    party.room.broadcast(
        message,
        [sender.id]  // don't send to sender's ID
    )
}
