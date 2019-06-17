import { SecretsManager as AWSSecretsManager } from 'aws-sdk'
import { SecretsCache, SecretsCacheOptions } from '@fatlama/fl-secretsmanager-caching'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { FetchOptions, SecretsClient } from './types'
import { NotFoundError } from './errors'

interface SecretsClientOpts {
  awsClient: AWSSecretsManager
  secretsCache: SecretsCache
  cacheConfig: SecretsCacheOptions
}

/**
 * Provides an interface on top of AWS Secrets Manager that abstracts away fetching
 * secrets information from either the SecretString or SecretBinary, plus provides
 * helper functions for fetching to data types
 *
 * == Getting started
 *
 * > const client = new SecretsClient()
 * > const credentials = await client.fetchJSON<Credentials>('my/secret/name')
 *
 * // Fetch for a specific VersionStage
 * > const apiKey = await client.fetchString('my/api/key', { versionStage: 'AWSPENDING' })
 */
export class AWSSecretsClient implements SecretsClient {
  private _cacheClient: SecretsCache

  public constructor(clientOpts: Partial<SecretsClientOpts> = {}) {
    const awsClient = clientOpts.awsClient || new AWSSecretsManager()
    const cacheConfig = { client: awsClient, ...clientOpts.cacheConfig }

    this._cacheClient = clientOpts.secretsCache || new SecretsCache(cacheConfig)
  }

  /**
   * Fetch the secret and attempt to parse the payload as JSON
   *
   * == Example
   * > const credentials: Credentials = await client.fetchString<Credentials>('my/secret/name')
   *
   * @type T the expected return shape
   */
  public async fetchJSON<T>(secretId: string, opts: FetchOptions = {}): Promise<T> {
    const secret = await this.fetchString(secretId, opts)

    return JSON.parse(secret)
  }

  public async fetchString(secretId: string, opts: FetchOptions = {}): Promise<string> {
    const secret = await this._getSecret(secretId, opts)

    if (!secret) {
      throw new NotFoundError("can't find the specified secret")
    }

    if (secret.SecretString) {
      return secret.SecretString
    }

    if (secret.SecretBinary) {
      return Buffer.from(secret.SecretBinary as string, 'base64').toString()
    }

    throw new Error('expected SecretString or SecretBinary to be present')
  }

  /**
   * Fetch the secret and return the response payload as a Buffer regardless if the payload
   * is in SecretString or SecretBinary
   */
  public async fetchBuffer(secretId: string, opts: FetchOptions = {}): Promise<Buffer> {
    const secret = await this._getSecret(secretId, opts)

    if (!secret) {
      throw new NotFoundError("can't find the specified secret")
    }

    if (secret.SecretBinary) {
      return Buffer.from(secret.SecretBinary as string, 'base64')
    }

    if (secret.SecretString) {
      return Buffer.from(secret.SecretString)
    }

    throw new Error('expected SecretString or SecretBinary to be present')
  }

  private async _getSecret(
    secretId: string,
    opts: FetchOptions
  ): Promise<GetSecretValueResponse | null> {
    return this._cacheClient.getSecretValue(secretId, opts)
  }
}
