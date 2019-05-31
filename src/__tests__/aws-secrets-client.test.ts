import * as AWS from 'aws-sdk-mock'
import { AWSError, SecretsManager } from 'aws-sdk'
import { AWSSecretsClient } from '../aws-secrets-client'
import { GetSecretValueRequest, GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'

interface Credential {
  username: string
  password: string
}

describe('AWSSecretsClient', () => {
  let client: AWSSecretsClient, awsClient: SecretsManager

  const jsonSecret = {
    username: 'kitty',
    password: 's00perSekr3t'
  }

  const textSecret = JSON.stringify(jsonSecret)

  const responses: {
    [key: string]: Pick<GetSecretValueResponse, 'SecretBinary' | 'SecretString'>
  } = {
    mySecretString: {
      SecretString: textSecret
    },
    mySecretBinary: {
      SecretBinary: Buffer.from(textSecret).toString('base64')
    },
    myInvalidJson: {
      SecretString: 'not-valid-json'
    },
    awsDoneMessedUp: {}
  }

  beforeEach(() => {
    AWS.mock('SecretsManager', 'getSecretValue', (
      params: GetSecretValueRequest,
      // eslint-disable-next-line promise/prefer-await-to-callbacks,@typescript-eslint/no-explicit-any
      callback: (err: any, data?: GetSecretValueResponse) => void
    ) => {
      const response = responses[params.SecretId]
      if (response) {
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        return callback(null, response)
      }

      const error = new AWSError('Could not find secret')
      // eslint-disable-next-line promise/prefer-await-to-callbacks
      return callback(error)
    })

    awsClient = new SecretsManager()
    client = new AWSSecretsClient({ awsClient })
  })

  afterEach(() => {
    AWS.restore()
  })

  describe('constructor', () => {
    it('uses the supplied awsClient', async () => {
      const awsClient = new SecretsManager()
      const getSpy = jest.spyOn(awsClient, 'getSecretValue')

      const client = new AWSSecretsClient({ awsClient })
      await client.fetchString('mySecretString')

      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    it('can initialize its own awsClient', async () => {
      const client = new AWSSecretsClient()
      const result = await client.fetchString('mySecretString')
      expect(result).toEqual(textSecret)
    })
  })

  describe('fetchString', () => {
    it('returns the expected string from a SecretString', async () => {
      const secret = await client.fetchString('mySecretString')
      expect(secret).toEqual(textSecret)
    })

    it('returns the expected string from a SecretBinary', async () => {
      const secret = await client.fetchString('mySecretBinary')
      expect(secret).toEqual(textSecret)
    })

    it('passes down the versionId and versionStage if provided', async () => {
      const getSpy = jest.spyOn(awsClient, 'getSecretValue')

      const versionId = '12345678'
      const versionStage = 'AWSPREVIOUS'

      await client.fetchString('mySecretString', { versionId, versionStage })

      expect(getSpy).toBeCalledWith({
        SecretId: 'mySecretString',
        VersionId: versionId,
        VersionStage: versionStage
      })
    })

    it('throws the original AWS error on a missing secret', async () => {
      const promise = client.fetchString('not-a-real-secret')
      await expect(promise).rejects.toThrow(AWSError)
    })

    it('throws an error if AWS returns an invalid response', async () => {
      const promise = client.fetchString('awsDoneMessedUp')
      await expect(promise).rejects.toThrow(Error)
    })
  })

  describe('fetchJSON', () => {
    it('returns the expected JSON from a SecretString', async () => {
      const secret = await client.fetchJSON<Credential>('mySecretString')
      expect(secret).toEqual(jsonSecret)
    })

    it('returns the expected JSON from a SecretBinary', async () => {
      const secret = await client.fetchJSON<Credential>('mySecretBinary')
      expect(secret).toEqual(jsonSecret)
    })

    it('passes down the versionId and versionStage if provided', async () => {
      const getSpy = jest.spyOn(awsClient, 'getSecretValue')

      const versionId = '12345678'
      const versionStage = 'AWSPREVIOUS'

      await client.fetchJSON('mySecretString', { versionId, versionStage })

      expect(getSpy).toBeCalledWith({
        SecretId: 'mySecretString',
        VersionId: versionId,
        VersionStage: versionStage
      })
    })

    it('throws the original JSON parse exception on invalid JSON', async () => {
      const promise = client.fetchJSON<Credential>('myInvalidJson')
      expect(promise).rejects.toThrow(SyntaxError)
    })

    it('throws the original AWS error on a missing secret', async () => {
      const promise = client.fetchJSON<Credential>('not-a-real-secret')
      await expect(promise).rejects.toThrow(AWSError)
    })
  })

  describe('fetchBuffer', () => {
    it('returns the expected string from a SecretString', async () => {
      const secret = await client.fetchBuffer('mySecretString')
      expect(secret).toBeInstanceOf(Buffer)
      expect(secret.toString()).toEqual(textSecret)
    })

    it('returns the expected string from a SecretBinary', async () => {
      const secret = await client.fetchBuffer('mySecretBinary')
      expect(secret).toBeInstanceOf(Buffer)
      expect(secret.toString()).toEqual(textSecret)
    })

    it('passes down the versionId and versionStage if provided', async () => {
      const getSpy = jest.spyOn(awsClient, 'getSecretValue')

      const versionId = '12345678'
      const versionStage = 'AWSPREVIOUS'

      await client.fetchBuffer('mySecretString', { versionId, versionStage })

      expect(getSpy).toBeCalledWith({
        SecretId: 'mySecretString',
        VersionId: versionId,
        VersionStage: versionStage
      })
    })

    it('throws the original AWS error on a missing secret', async () => {
      const promise = client.fetchBuffer('not-a-real-secret')
      await expect(promise).rejects.toThrow(AWSError)
    })

    it('throws an error if AWS returns an invalid response', async () => {
      const promise = client.fetchBuffer('awsDoneMessedUp')
      await expect(promise).rejects.toThrow(Error)
    })
  })
})
