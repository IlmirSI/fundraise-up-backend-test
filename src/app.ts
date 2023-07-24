import { join } from 'path'
import { Application } from './lib/application'
import { env } from './lib/env-loader'

env(join(__dirname, '../.env'))

const app = new Application({ min: 1, max: 10, generationIntervalMs: 200 })
app.start()

process.on('SIGINT', async () => {
    console.info(' graceful shutdown')
    try {
        await app.gracefulShutdown()
        console.log('Bye')
        process.exit(0)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
})
