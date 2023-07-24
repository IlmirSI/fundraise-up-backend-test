import { join } from 'path'
import { env } from './lib/env-loader'
import { SyncApplication } from './lib/sync-application'

env(join(__dirname, '../.env'))

const syncApplication = new SyncApplication()
syncApplication.start()

process.on('SIGINT', async () => {
    console.info(' graceful shutdown')
    try {
        await syncApplication.gracefulShutdown()
        console.log('Bye')
        process.exit(0)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
})
