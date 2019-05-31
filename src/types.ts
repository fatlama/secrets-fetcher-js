export interface FetchOpts {
  versionId?: string
  versionStage?: string
}

export interface SecretsClient {
  fetchJSON<T>(secretId: string, opts?: FetchOpts): Promise<T>
  fetchString(secretId: string, opts?: FetchOpts): Promise<string>
  fetchBuffer(secretId: string, opts?: FetchOpts): Promise<Buffer>
}
