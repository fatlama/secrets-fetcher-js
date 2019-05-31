import LRU from 'lru-cache'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueRequest, GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { CacheConfig } from './types'
import { CachedSecretVersion } from './cached-secret-version'

interface CachedSecretArgs {
  secretId: string
  client: Pick<SecretsManager, 'describeSecret' | 'getSecretValue'>
  config: CacheConfig
}

interface StringHashMap {
  [key: string]: string
}

/**
 * A CachedSecret represents a single SecretId in AWS SecretsManager
 *
 * == Rules
 *
 * * Secrets can have many versions
 * * Secrets can have many stages (AWSCURRENT, AWSPREVIOUS, AWSPENDING, etc)
 * * A stage maps to one version
 * * A version can map to many stages
 *
 * == Example
 *
 * > const cachedSecret = new CachedSecret({
 *     secretId: 'mySuperTopSecret',
 *     client: new AWS.SecretsManager(),
 *     config: {
 *       secretRefreshInterval: 60 * 5, ...
 *     }
 *   })
 * > const secretValue = await cachedSecret.getSecretValue()
 * > secretValue
 * {
 *   SecretString: '{"username":"myUsername","password":"s00perSekret"}',
 *   ...
 * }
 */
export class CachedSecret {
  private _secretId: string
  private _client: Pick<SecretsManager, 'describeSecret' | 'getSecretValue'>
  private _config: CacheConfig

  private _versionIdsByStage: StringHashMap
  private _nextRefreshTime: number

  private _versionCache: LRU<string, CachedSecretVersion>

  public constructor(args: CachedSecretArgs) {
    this._config = args.config
    this._client = args.client
    this._secretId = args.secretId

    this._versionIdsByStage = {}
    this._versionCache = new LRU<string, CachedSecretVersion>(10)
    this._nextRefreshTime = Date.now() - 1
  }

  /**
   * Fetch the current value for the given versionStage
   *
   * @param request either a VersionId or VersionStage whose value should be fetched
   */
  public async getSecretValue(
    request: Pick<GetSecretValueRequest, 'VersionId' | 'VersionStage'>
  ): Promise<GetSecretValueResponse | null> {
    const versionId = request.VersionId
    if (versionId) {
      const version = await this._getVersionById(versionId)

      return version.getSecretValue()
    }

    const versionStage = request.VersionStage
    const version = await this._getVersionForStage(versionStage || this._config.defaultVersionStage)
    if (!version) {
      return null
    }

    return version.getSecretValue()
  }

  private async _getVersionForStage(versionStage: string): Promise<CachedSecretVersion | null> {
    const versionId = await this._getVersionIdForStage(versionStage)

    if (!versionId) {
      return null
    }

    return this._getVersionById(versionId)
  }

  private async _getVersionById(versionId: string): Promise<CachedSecretVersion> {
    const existing = this._versionCache.get(versionId)
    if (existing) {
      return existing
    }

    // The versionId is new to us, meaning a rotation is probably scheduled to happen soon
    const version = new CachedSecretVersion({
      client: this._client,
      config: this._config,
      secretId: this._secretId,
      versionId
    })

    this._versionCache.set(versionId, version)

    return version
  }

  private async _getVersionIdForStage(versionStage: string): Promise<string | null> {
    if (Date.now() > this._nextRefreshTime) {
      await this._refreshVersions()
    }

    return this._versionIdsByStage[versionStage] || null
  }

  private async _refreshVersions(): Promise<void> {
    const result = await this._client.describeSecret({ SecretId: this._secretId }).promise()

    if (!result.VersionIdsToStages) {
      // This secret has no versions attached to it
      // TODO Decide if we should _resetRefreshTime here
      // TODO Decide if we should be throwing an exception here
      this._versionIdsByStage = {}
      return
    }

    const versionIdsByStage: StringHashMap = {}

    Object.keys(result.VersionIdsToStages).forEach(
      (versionId): void => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const stages = result.VersionIdsToStages![versionId]
        if (!stages) {
          return
        }

        stages.forEach(
          (stage): void => {
            versionIdsByStage[stage] = versionId
          }
        )
      }
    )

    this._versionIdsByStage = versionIdsByStage
    this._resetRefreshTime()
  }

  private _resetRefreshTime(): void {
    // Aim to have the refresh happen in the latter half between now and the TTL
    const ttl = this._config.secretRefreshInterval
    const midTtl = Math.floor(ttl / 2)
    const randomTtl = midTtl + Math.random() * (ttl - midTtl)
    this._nextRefreshTime = Date.now() + randomTtl
  }
}
