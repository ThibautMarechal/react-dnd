import * as React from 'react'
import { memo } from 'react'
import { BackendFactory, DragDropManager } from 'dnd-core'
import { DndContext, createDndContext, DndContextType } from './DndContext'

export type DndProviderProps<BackendContext, BackendOptions> =
	| {
			manager: DragDropManager
	  }
	| {
			backend: BackendFactory
			context?: BackendContext
			options?: BackendOptions
			debugMode?: boolean
			multiWindow?: boolean
	  }

let refCount = 0

/**
 * A React component that provides the React-DnD context
 */
export const DndProvider: React.FC<DndProviderProps<any, any>> = memo(
	({ children, ...props }) => {
		const [dndContext, isGlobalInstance] = getDndContextValue(props) // memoized from props

		/**
		 * If the global context was used to store the DND context
		 * then where theres no more references to it we should
		 * clean it up to avoid memory leaks
		 */
		React.useEffect(() => {
			if (isGlobalInstance) {
				refCount++
			}

			return () => {
				if (isGlobalInstance) {
					refCount--

					if (refCount === 0) {
						const context = getGlobalContext()
						context[instanceSymbol] = null
					}
				}
				dndContext.dragDropManager?.dispose?.()
			}
		}, [])

		return (
			<DndContext.Provider value={dndContext}>{children}</DndContext.Provider>
		)
	},
)
DndProvider.displayName = 'DndProvider'

function getDndContextValue(
	props: DndProviderProps<any, any>,
): [DndContextType, boolean] {
	if ('manager' in props) {
		const dndContext = { dragDropManager: props.manager }
		return [dndContext, false]
	}

	const dndContext = createSingletonDndContext(
		props.backend,
		props.context,
		props.options,
		props.debugMode,
		props.multiWindow,
	)
	const isGlobalInstance = !props.context

	return [dndContext, isGlobalInstance]
}

const instanceSymbol = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__')
function createSingletonDndContext<BackendContext, BackendOptions>(
	backend: BackendFactory,
	context: BackendContext = getGlobalContext(),
	options: BackendOptions,
	debugMode?: boolean,
	multiWindow?: boolean,
) {
	const ctx = context as any
	if (!ctx[instanceSymbol]) {
		ctx[instanceSymbol] = createDndContext(
			backend,
			context,
			options,
			debugMode,
			multiWindow,
		)
	}
	return ctx[instanceSymbol] as DndContextType
}

declare const global: any
function getGlobalContext() {
	return typeof global !== 'undefined' ? global : (window as any)
}
