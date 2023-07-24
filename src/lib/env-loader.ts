import { PathLike, readFileSync } from 'fs'

export const env = (path: PathLike): void => {
    const envFile = readFileSync(path, { encoding: 'utf-8' })
    envFile.split('\n').forEach((env) => {
        const [key, value] = env.split('=')
        process.env[key] = value
    })
}
