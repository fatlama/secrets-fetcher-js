import LRU from 'lru-cache'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { CachedSecret } from './cached-secret'
import { CacheConfig, DEFAULT_CACHE_CONFIG } from './types'

interface SecretsCacheOpts {
  client: Pick<SecretsManager, 'describeSecret' | 'getSecretValue'>
  config: CacheConfig
}

interface GetSecretValueOpts {
  versionId?: string
  versionStage?: string
}

/**
 * Provides a read-only cache store for fetching secrets stored in AWS Secrets Manager
 *
 * == Basic Usage
 *
 * > const cache = new SecretsCache()
 *
 * // Fetch the default AWSCURRENT version
 * > const secret = await cache.getSecretValue({ SecretId: 'mySecret' })
 * {
 *   ARN: 'arn:aws:...',
 *   SecretString: '...',
 *   ...
 * }
 *
 * // Fetch a specific VersionStage
 * > const secret = await cache.getSecretValue(
 *   'mySecret',
 *   { versionStage: 'AWSPREVIOUS' }
 * })
 */
export class SecretsCache {
  private _client: Pick<SecretsManager, 'describeSecret' | 'getSecretValue'>
  private _cache: LRU<string, CachedSecret>
  private _config: CacheConfig

  public constructor(opts: Partial<SecretsCacheOpts> = {}) {
    this._client = opts.client || new SecretsManager()
    this._config = { ...DEFAULT_CACHE_CONFIG, ...opts.config }
    this._cache = new LRU<string, CachedSecret>(this._config.maxCacheSize)
  }

  /**
   * Uses the cached response for SecretsManager.GetSecretValue
   *
   * @param request the request as you would normally use when calling SecretsManager.GetSecretValue
   */
  public async getSecretValue(
    secretId: string,
    opts: GetSecretValueOpts = {}
  ): Promise<GetSecretValueResponse | null> {
    const existing = this._cache.get(secretId)
    if (existing) {
      return existing.getSecretValue(opts)
    }

    const secret = new CachedSecret({
      client: this._client,
      config: this._config,
      secretId
    })

    this._cache.set(secretId, secret)

    return secret.getSecretValue(opts)
  }
}
