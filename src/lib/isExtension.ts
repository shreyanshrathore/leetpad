import { isExtensionPageContext } from './runtimeContext'

/** True when running inside a chrome-extension:// page (side panel). */
export function isExtensionContext(): boolean {
  return isExtensionPageContext()
}
