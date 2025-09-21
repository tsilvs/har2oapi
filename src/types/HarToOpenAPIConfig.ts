import { generateSpec } from 'har-to-openapi'

/** 
 * Should've been imported, but is not exported from `har-to-openapi` yet.
 */
export type HarToOpenAPIConfig = Parameters<typeof generateSpec>[1]