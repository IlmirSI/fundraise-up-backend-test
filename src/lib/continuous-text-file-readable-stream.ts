import { PathLike } from 'node:fs'
import { FileChangeInfo, open, watch } from 'node:fs/promises'
import { Readable, ReadableOptions } from 'node:stream'

export interface FileReadableStreamOptions extends ReadableOptions {
    start?: number
    itemSize?: number
}

export class ContinuousTextFileReadableStream extends Readable {
    private watcher!: AsyncIterable<FileChangeInfo<string>>
    private position: number
    private highWaterMark: number
    private textDecoder: TextDecoder
    private isClosing = false

    private isReading = false

    constructor(
        private readonly path: PathLike,
        options: FileReadableStreamOptions = {}
    ) {
        const { start, highWaterMark, ...readableOption } = options
        super(readableOption)
        this.position = start ?? 0
        this.highWaterMark = highWaterMark ?? 16 * 1024
        this.textDecoder = new TextDecoder('utf-8')

        this.startWatcher()
    }

    private async startWatcher() {
        this.watcher = watch(this.path)
        for await (const _ of this.watcher) {
            if (this.isClosing) break
            this._read()
        }
    }

    async _read(): Promise<void> {
        if (this.isReading) return
        this.isReading = true
        const file = await open(this.path, 'r')
        const { buffer, bytesRead } = await file.read({
            buffer: Buffer.alloc(this.highWaterMark),
            position: this.position,
        })
        const chunk = this.textDecoder.decode(buffer).slice(0, bytesRead)
        this.position += bytesRead
        await file.close()
        this.push({ data: chunk, position: this.position })
        this.isReading = false
    }

    stop() {
        this.isClosing = true
        this.emit('close')
    }
}
