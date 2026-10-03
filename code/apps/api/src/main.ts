import { createApp } from './create-app.js'
import { listenPort } from './listen-port.js'

const app = await createApp()
await app.listen(listenPort())
