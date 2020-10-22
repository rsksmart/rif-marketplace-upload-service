import { Comms } from '../../communication'
import { ProviderManager } from './providers'

type UploadRouteHandler = () => Promise<void>

export default function (storageProvider: ProviderManager, comms: Comms): UploadRouteHandler {
    return () => {
        return Promise.reject()
    }
}
