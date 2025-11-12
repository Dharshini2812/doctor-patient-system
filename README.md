# Doctor–Patient Chat Frontend

This is a lightweight, responsive chat UI that connects to a WebSocket server.

## Run

Open `index.html` in a browser. No build step is required.

## Configure WebSocket URL

By default the client connects to `ws://localhost:8080/chat`.

To change it at runtime, open DevTools console and run:

```js
localStorage.setItem('WS_URL', 'ws://YOUR_HOST:PORT/chat');
location.reload();
```

## Protocol (example)

The client expects JSON frames like below. Adjust your Java server to match:

- Message from any user
```json
{"type":"message","from":"doctor-1","to":"p1","text":"Hello"}
```
- Typing indicator
```json
{"type":"typing","userId":"p1","to":"doctor-1","isTyping":true}
```
- Presence update
```json
{"type":"presence","userId":"p1","online":true}
```

Outgoing frames from the doctor follow the same shapes.

## Notes

- Auto-reconnects after disconnect (2 seconds).
- Auto-scrolls to the latest message.
- Patients list is demo data; replace with real users/presence from your backend.








