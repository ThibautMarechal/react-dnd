import { DragDropManagerImpl } from './DragDropManagerImpl'
import { BackendFactory, DisposableDragDropManager } from './interfaces'

export function createDragDropManager(
	backendFactory: BackendFactory,
	globalContext: unknown,
	backendOptions: unknown,
	debugMode?: boolean,
	multiWindow?: boolean,
): DisposableDragDropManager {
	const manager = new DragDropManagerImpl(debugMode, multiWindow)
	const backend = backendFactory(manager, globalContext, backendOptions)
	manager.receiveBackend(backend)
	return manager
}
