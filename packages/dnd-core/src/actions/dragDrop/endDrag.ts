import { invariant } from '@react-dnd/invariant'
import {
	DragDropManager,
	SentinelAction,
	DragDropMonitor,
} from '../../interfaces'
import { END_DRAG } from './types'

export function createEndDrag(manager: DragDropManager) {
	return function endDrag(): SentinelAction {
		const monitor = manager.getMonitor()
		verifyIsDragging(monitor)
		return { type: END_DRAG }
	}
}

function verifyIsDragging(monitor: DragDropMonitor) {
	invariant(monitor.isDragging(), 'Cannot call endDrag while not dragging.')
}
