import * as React from 'react'
import {
	DisposableDragDropManager,
	BackendFactory,
	createDragDropManager,
} from 'dnd-core'

/**
 * The React context type
 */
export interface DndContextType {
	dragDropManager?: DisposableDragDropManager
}

/**
 * Create the React Context
 */
export const DndContext = React.createContext<DndContextType>({
	dragDropManager: undefined,
})

/**
 * Creates the context object we're providing
 * @param backend
 * @param context
 */
export function createDndContext<BackendContext, BackendOptions>(
	backend: BackendFactory,
	context?: BackendContext,
	options?: BackendOptions,
	debugMode?: boolean,
	multiWindow?: boolean,
): DndContextType {
	return {
		dragDropManager: createDragDropManager(
			backend,
			context,
			options,
			debugMode,
			multiWindow,
		),
	}
}
