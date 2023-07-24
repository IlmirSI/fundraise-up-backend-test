import {
    PathLike,
    WriteStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { EventEmitter, Readable } from 'node:stream'
import { setInterval, setTimeout } from 'node:timers/promises'
import { ContinuousTextFileReadableStream } from './continuous-text-file-readable-stream'
import { readFile, writeFile } from 'node:fs/promises'

const ITEM_SIZE = 25
const SEPARATOR = ','

export interface QueueParams {
    collectCount: number
    collectInterval: number
    dirPath?: string
}

export interface QueueStorage<TItem> {
    recover(): TItem[]
    save(items: TItem[]): void
    close(): void
}

export class Queue extends EventEmitter {
    private data: { items: string[]; position: number } = {
        items: [],
        position: 0,
    }
    private dataPath: PathLike
    private conditionPath: PathLike

    private dataWriteStream!: WriteStream
    private dataReadStream!: Readable

    private highWaterMark: number
    private isPending = false
    private isClosing = false

    private condition: { position: number } = { position: 0 }

    constructor(private readonly params: QueueParams) {
        super()

        // set default values
        this.params.dirPath = this.params.dirPath ?? 'queue'

        this.dataPath = join(this.params.dirPath, 'data')
        this.conditionPath = join(this.params.dirPath, 'condition')
        this.highWaterMark = ITEM_SIZE * this.params.collectCount

        if (!existsSync(this.params.dirPath!)) mkdirSync(this.params.dirPath!)
        if (!existsSync(this.dataPath)) writeFileSync(this.dataPath, '')
        if (!existsSync(this.conditionPath))
            writeFileSync(
                this.conditionPath,
                this.condition.position.toString()
            )
    }

    private async startInterval() {
        for await (const _ of setInterval(this.params.collectInterval)) {
            if (this.isClosing) break
            this.collected()
        }
    }

    private async collected() {
        this.dataReadStream.pause()
        this.emit('collected', this.data.items, this.data.position)
        this.data.items = []
    }

    private async createReadStream() {
        const start = Number.parseInt(
            await readFile(this.conditionPath, { encoding: 'utf-8' })
        )
        this.dataReadStream = new ContinuousTextFileReadableStream(
            this.dataPath,
            {
                highWaterMark: this.highWaterMark,
                objectMode: true,
                start,
            }
        )

        this.dataReadStream.on(
            'data',
            async ({ data, position }: { data: string; position: number }) => {
                if (data === '') return

                const newItems = data.slice(0, -1).split(SEPARATOR)
                this.data.items.push(...newItems)
                this.data.position = position

                if (this.data.items.length >= this.params.collectCount) {
                    await this.collected()
                }
            }
        )
    }

    public async produce(items: string[]): Promise<void> {
        if (this.dataWriteStream === undefined)
            this.dataWriteStream = createWriteStream(this.dataPath, {
                flags: 'a',
            })

        this.dataWriteStream.write(
            `${items.join(SEPARATOR)}${SEPARATOR}`,
            'utf8'
        )
    }

    public async consume(
        listener: (items: string[]) => Promise<true>
    ): Promise<void> {
        this.startInterval()

        await this.createReadStream()
        this.addListener(
            'collected',
            async (items: string[], position: number) => {
                if (items.length === 0 || this.isPending) return
                this.isPending = true

                const result = await listener(items)
                this.isPending = false
                if (result) {
                    this.dataReadStream.resume().read()
                    await writeFile(this.conditionPath, position.toString())
                }
            }
        )
    }

    public async close() {
        this.isClosing = true

        if (this.isPending) {
            for (let i = 0; i < 3; i++) {
                await setTimeout(1000)
                if (this.isPending) continue
                else break
            }
        }
        if (this.isPending)
            throw new Error(`couldn't wait for listener to finish`)

        this.removeAllListeners()
    }
}
