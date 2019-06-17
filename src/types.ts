import { GetSecretValueOptions } from '@fatlama/fl-secretsmanager-caching'

/**
 * For now these match 1:1, but allow for deviation in the future
 */
export type FetchOptions = GetSecretValueOptions

export interface SecretsClient {
  fetchJSON<T>(secretId: string, opts?: FetchOptions): Promise<T>
  fetchString(secretId: string, opts?: FetchOptions): Promise<string>
  fetchBuffer(secretId: string, opts?: FetchOptions): Promise<Buffer>
}
