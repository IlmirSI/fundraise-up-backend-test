import { createRandomCustomers } from './create-random-customers'
import { join } from 'path'
import { Queue } from './queue'
import { randomInt } from 'crypto'
import { setInterval } from 'timers/promises'

export const DIR_PATH = join(__dirname, '../data/')
export const FILE_NAME = 'inserted_customer_ids.txt'

export interface ApplicationConfiguration {
    min: number
    max: number
    generationIntervalMs: number
}

export class Application {
    queue: Queue
    isClosing = false

    constructor(private readonly configuration: ApplicationConfiguration) {
        this.queue = new Queue({ collectCount: 1000, collectInterval: 1000 })
    }

    async start(): Promise<void> {
        for await (const _ of setInterval(
            this.configuration.generationIntervalMs
        )) {
            const count = randomInt(
                this.configuration.min,
                this.configuration.max
            )
            if (this.isClosing) break
            console.time(`Created ${count} customers`)
            const { insertedIds } = await createRandomCustomers(count)
            this.queue.produce(
                Object.values(insertedIds).map((id) => id.toString())
            )
            console.timeEnd(`Created ${count} customers`)
        }
    }

    async gracefulShutdown(): Promise<void> {
        this.isClosing = true
        await this.queue.close()
    }
}
