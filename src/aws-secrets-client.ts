import { SecretsManager as AWSSecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { FetchOpts, SecretsClient } from './types'

interface SecretsClientOpts {
  awsClient: AWSSecretsManager
}

/**
 * Provides an interface on top of AWS Secrets Manager that abstracts away fetching
 * secrets information from either the SecretString or SecretBinary, plus provides
 * helper functions for fetching to data types
 *
 * == Getting started
 *
 * > const client = new SecretsClient()
 * > const credentials: Credentials = await client.fetchString<Credentials>({ secretId: 'my/secret/name' })
 *
 * == TODO
 *
 * * Add an L1 caching option
 */
export class AWSSecretsClient implements SecretsClient {
  private _client: AWSSecretsManager

  public constructor(clientOpts: Partial<SecretsClientOpts> = {}) {
    this._client = clientOpts.awsClient || new AWSSecretsManager()
  }

  /**
   * Fetch the secret and attempt to parse the payload as JSON
   *
   * == Example
   * > const credentials: Credentials = await client.fetchString<Credentials>({ secretId: 'my/secret/name' })
   *
   * @type T the expected return shape
   */
  public async fetchJSON<T>(fetchArgs: FetchOpts): Promise<T> {
    const secret = await this.fetchString(fetchArgs)

    return JSON.parse(secret)
  }

  public async fetchString(fetchArgs: FetchOpts): Promise<string> {
    const secret = await this._getSecret(fetchArgs)

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
  public async fetchBuffer(fetchArgs: FetchOpts): Promise<Buffer> {
    const secret = await this._getSecret(fetchArgs)

    if (secret.SecretBinary) {
      return Buffer.from(secret.SecretBinary as string, 'base64')
    }

    if (secret.SecretString) {
      return Buffer.from(secret.SecretString)
    }

    throw new Error('expected SecretString or SecretBinary to be present')
  }

  private async _getSecret(fetchArgs: FetchOpts): Promise<GetSecretValueResponse> {
    const { secretId, versionId, versionStage } = fetchArgs

    return this._client
      .getSecretValue({
        SecretId: secretId,
        VersionId: versionId,
        VersionStage: versionStage
      })
      .promise()
  }
}
