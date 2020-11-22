import { parse } from 'query-string'

export function isMultiWindow(): boolean {
	if (typeof window !== 'undefined') {
		const queryObject = parse(window.location.search)
		return (
			queryObject.multiWindow !== undefined ||
			localStorage.REACT_DND_MULTI_WINDOW === 'true'
		)
	} else {
		return false
	}
}
