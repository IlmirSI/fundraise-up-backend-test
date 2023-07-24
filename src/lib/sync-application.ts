import { AnyBulkWriteOperation, ObjectId } from 'mongodb'

import { CustomersAnonymisedRepository } from '../models/customer-anonymised'
import { CustomerDocument, CustomersCollection } from '../models/customer'

import { Queue } from './queue'
import { anonymizeCustomer } from './anonymize-customer'

export type SyncApplicationConfiguration = {
    chunkSize: number
    shutdownTimeout?: number
}
const isFullReindex = (): boolean => process.argv[2] === '--full-reindex'

export class SyncApplication {
    chunkSize: number
    shutdownTimeout: number
    queue: Queue | undefined

    constructor(configuration?: SyncApplicationConfiguration) {
        this.chunkSize = configuration?.chunkSize ?? 1000
        this.shutdownTimeout = configuration?.shutdownTimeout ?? 3000
    }

    async start() {
        if (isFullReindex()) {
            console.time('Completed')
            const findCursor = CustomersCollection.find()
            let operations: AnyBulkWriteOperation<CustomerDocument>[] = []
            for await (const customer of findCursor) {
                operations.push({
                    replaceOne: {
                        filter: { _id: customer._id },
                        replacement: anonymizeCustomer(customer),
                        upsert: true,
                    },
                })
                if (operations.length >= this.chunkSize) {
                    console.time(`Anonymized ${this.chunkSize} clients`)
                    await CustomersAnonymisedRepository.bulkWrite(operations)
                    operations = []
                    console.timeEnd(`Anonymized ${this.chunkSize} clients`)
                }
            }
            console.time(`Anonymized ${operations.length} clients`)
            await CustomersAnonymisedRepository.bulkWrite(operations)
            console.timeEnd(`Anonymized ${operations.length} clients`)
            console.timeEnd('Completed')
            process.exit(0)
        } else {
            this.queue = new Queue({
                collectCount: 1000,
                collectInterval: 1000,
            })
            this.queue.consume(async (items: string[]): Promise<true> => {
                console.time(`Anonymized ${items.length} clients`)
                const findCursor = CustomersCollection.find({
                    _id: { $in: items.map((item) => new ObjectId(item)) },
                })
                const operations: AnyBulkWriteOperation<CustomerDocument>[] = []
                for await (const customer of findCursor) {
                    operations.push({
                        replaceOne: {
                            filter: { _id: customer._id },
                            replacement: anonymizeCustomer(customer),
                            upsert: true,
                        },
                    })
                }
                await CustomersAnonymisedRepository.bulkWrite(operations)
                console.timeEnd(`Anonymized ${items.length} clients`)

                return true
            })
        }
    }

    async gracefulShutdown(): Promise<void> {
        if (this.queue !== undefined) await this.queue.close()
    }
}
