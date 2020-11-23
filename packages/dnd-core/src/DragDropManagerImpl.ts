import { createStore, Store, Action, AnyAction } from 'redux'
import { reduce } from './reducers'
import {
	BEGIN_DRAG,
	createDragDropActions,
	END_DRAG,
	HOVER,
	INIT_COORDS,
} from './actions/dragDrop'
import { DragDropMonitorImpl } from './DragDropMonitorImpl'
import { HandlerRegistryImpl } from './HandlerRegistryImpl'
import {
	ActionCreator,
	Backend,
	DragDropActions,
	DragDropMonitor,
	DisposableDragDropManager,
	HandlerRegistry,
} from './interfaces'
import { State } from './reducers'

function makeStoreInstance(debugMode: boolean): Store<State> {
	// TODO: if we ever make a react-native version of this,
	// we'll need to consider how to pull off dev-tooling
	const reduxDevTools =
		typeof window !== 'undefined' &&
		(window as any).__REDUX_DEVTOOLS_EXTENSION__
	return createStore(
		reduce,
		debugMode &&
			reduxDevTools &&
			reduxDevTools({
				name: 'dnd-core',
				instanceId: 'dnd-core',
			}),
	)
}

function noOffsetAction(action: AnyAction): AnyAction {
	if (action.type === HOVER) {
		return {
			type: HOVER,
			payload: {
				targetIds: action.payload.targetIds,
				clientOffset: null,
			},
		}
	}
	if (action.type === BEGIN_DRAG) {
		return {
			type: BEGIN_DRAG,
			payload: {
				...action.payload,
				clientOffset: null,
				sourceClientOffset: null,
			},
		}
	}
	if (action.type === INIT_COORDS) {
		return {
			type: INIT_COORDS,
			payload: {
				clientOffset: null,
				sourceClientOffset: null,
			},
		}
	}
	return action
}

export class DragDropManagerImpl implements DisposableDragDropManager {
	private store: Store<State>
	private monitor: DragDropMonitor
	private backend: Backend | undefined
	private isSetUp = false
	private broadcastChannel: BroadcastChannel | null = null

	public constructor(debugMode = false, multiWindow = false) {
		const store = this.makeStoreInstance(debugMode, multiWindow)
		this.store = store
		this.monitor = new DragDropMonitorImpl(
			store,
			new HandlerRegistryImpl(store),
		)
		store.subscribe(this.handleRefCountChange)
	}

	private makeStoreInstance(
		debugMode: boolean,
		multiWindow: boolean,
	): Store<State> {
		const store = makeStoreInstance(debugMode)
		// Verify that BroadcastChannel is supported
		const useBroadcastChannel =
			multiWindow && 'BroadcastChannel' in (window ?? {})
		if (useBroadcastChannel) {
			this.broadcastChannel = new BroadcastChannel('react-dnd')
			this.broadcastChannel.onmessage = (message) => {
				if (this.isSetUp) {
					store.dispatch(message.data)
				}
			}
		}

		return {
			...store,
			dispatch: (action) => {
				if (this.isSetUp && useBroadcastChannel) {
					this.broadcastChannel?.postMessage(noOffsetAction(action))
				}
				if (action.type === END_DRAG) {
					if (useBroadcastChannel) {
						// We need to wait the DROP event that may come from another window before dispatching the END_DRAG
						// Otherwise we cannot access the dropResult in the monitor (END_DRAG event delete the drop result from the state)
						setTimeout(() => {
							this.notifySourceDragEnd()
							store.dispatch(action)
						}, 25)
						return action
					}
					this.notifySourceDragEnd()
				}
				return store.dispatch(action)
			},
		}
	}

	public receiveBackend(backend: Backend): void {
		this.backend = backend
	}

	public getMonitor(): DragDropMonitor {
		return this.monitor
	}

	public getBackend(): Backend {
		return this.backend as Backend
	}

	public getRegistry(): HandlerRegistry {
		return (this.monitor as DragDropMonitorImpl).registry
	}

	public getActions(): DragDropActions {
		/* eslint-disable-next-line @typescript-eslint/no-this-alias */
		const manager = this
		const { dispatch } = this.store

		function bindActionCreator(actionCreator: ActionCreator<any>) {
			return (...args: any[]) => {
				const action = actionCreator.apply(manager, args as any)
				if (typeof action !== 'undefined') {
					dispatch(action)
				}
			}
		}

		const actions = createDragDropActions(this)

		return Object.keys(actions).reduce(
			(boundActions: DragDropActions, key: string) => {
				const action: ActionCreator<any> = (actions as any)[
					key
				] as ActionCreator<any>
				;(boundActions as any)[key] = bindActionCreator(action)
				return boundActions
			},
			{} as DragDropActions,
		)
	}

	public dispatch(action: Action<any>): void {
		this.store.dispatch(action)
	}

	public dispose(): void {
		this.broadcastChannel?.close()
		this.broadcastChannel = null
	}

	private notifySourceDragEnd() {
		const registry = this.getRegistry()
		const sourceId = this.monitor.getSourceId()
		if (sourceId != null) {
			const source = registry.getSource(sourceId, true)
			if (source) {
				source.endDrag(this.monitor, sourceId)
				registry.unpinSource()
			}
		}
	}

	private handleRefCountChange = (): void => {
		const shouldSetUp = this.store.getState().refCount > 0
		if (this.backend) {
			if (shouldSetUp && !this.isSetUp) {
				this.backend.setup()
				this.isSetUp = true
			} else if (!shouldSetUp && this.isSetUp) {
				this.backend.teardown()
				this.isSetUp = false
			}
		}
	}
}
