import { v4 as newGuid } from 'uuid'

export function getNextUniqueId(): string {
	return newGuid()
}
