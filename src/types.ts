export interface FetchOpts {
  secretId: string
  versionId?: string
  versionStage?: string
}

export interface SecretsClient {
  fetchJSON<T>(fetchOpts: FetchOpts): Promise<T>
  fetchString(fetchOpts: FetchOpts): Promise<string>
  fetchBuffer(fetchOpts: FetchOpts): Promise<Buffer>
}
