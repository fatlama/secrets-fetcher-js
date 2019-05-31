import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { CacheConfig } from './types'

interface CachedSecretVersionArgs {
  client: Pick<SecretsManager, 'getSecretValue'>
  config: CacheConfig
  secretId: string
  versionId: string
}

export class CachedSecretVersion {
  private _config: CacheConfig
  private _client: Pick<SecretsManager, 'getSecretValue'>

  private _secretId: string
  private _versionId?: string

  private _secretValue?: GetSecretValueResponse
  private _nextRefreshTime: number

  public constructor(args: CachedSecretVersionArgs) {
    this._client = args.client
    this._config = args.config
    this._secretId = args.secretId
    this._versionId = args.versionId

    this._nextRefreshTime = Date.now() - 1
  }

  /**
   * Checks the cache for a non-stale secret value and, failing that, fetches a new copy
   */
  public async getSecretValue(): Promise<GetSecretValueResponse | null> {
    if (Date.now() > this._nextRefreshTime) {
      await this._refreshSecretValue()
    }

    if (!this._secretValue) {
      return null
    }
    return { ...this._secretValue }
  }

  /**
   * Calls SecretsManager.GetSecretValue, caches the result, and resets the next refresh time
   *
   * TODO Implement retry/backoff logic
   */
  private async _refreshSecretValue(): Promise<void> {
    const result = await this._client
      .getSecretValue({
        SecretId: this._secretId,
        VersionId: this._versionId
      })
      .promise()
    this._secretValue = result

    this._resetRefreshTime()
  }

  /**
   * Sets _nextRefreshTime to a random time somewhere in the latter half of the interval set in
   * config.secretRefreshInterval
   */
  private _resetRefreshTime(): void {
    // Aim to have the refresh happen in the latter half between now and the TTL
    const ttl = this._config.secretRefreshInterval
    const midTtl = Math.floor(ttl / 2)
    const randomTtl = midTtl + Math.random() * (ttl - midTtl)
    this._nextRefreshTime = Date.now() + randomTtl
  }
}
