import * as AWS from 'aws-sdk-mock'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { SecretsCache } from '../../../fl-secretsmanager-caching-js'
import { AWSSecretsClient } from '../aws-secrets-client'

interface Credential {
  username: string
  password: string
}

describe('AWSSecretsClient', () => {
  let client: AWSSecretsClient, awsClient: SecretsManager, secretsCache: SecretsCache
  let getSpy: jest.SpyInstance

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

  const previousVersionId = '12345-previous-aws-version'

  const versionIdsToStages = {
    '54321-current-aws-version': ['AWSCURRENT'],
    '12345-previous-aws-version': ['AWSPREVIOUS']
  }

  beforeEach(() => {
    AWS.mock('SecretsManager', 'describeSecret', { VersionIdsToStages: versionIdsToStages })
    AWS.mock('SecretsManager', 'getSecretValue', responses.mySecretString)

    awsClient = new SecretsManager()
    secretsCache = new SecretsCache({ client: awsClient })
    client = new AWSSecretsClient({ secretsCache })

    getSpy = jest.spyOn(secretsCache, 'getSecretValue')
  })

  afterEach(() => {
    AWS.restore()
  })

  describe('constructor', () => {
    it('uses the supplied awsClient', async () => {
      const getSpy = jest.spyOn(awsClient, 'getSecretValue')
      const client = new AWSSecretsClient({ awsClient })
      await client.fetchString('mySecretString')

      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    it('can initialize its own awsClient', async () => {
      AWS.mock('SecretsManager', 'describeSecret', { VersionIdsToStages: versionIdsToStages })
      AWS.mock('SecretsManager', 'getSecretValue', responses.mySecretString)

      const client = new AWSSecretsClient()
      const result = await client.fetchString('mySecretString')
      expect(result).toEqual(textSecret)
    })

    it('allows consumers to configure the underlying cache', async () => {
      AWS.mock('SecretsManager', 'describeSecret', { VersionIdsToStages: versionIdsToStages })
      AWS.mock('SecretsManager', 'getSecretValue', responses.mySecretString)
      const getSpy = jest.spyOn(awsClient, 'getSecretValue')

      const client = new AWSSecretsClient({
        awsClient,
        cacheConfig: {
          config: {
            defaultVersionStage: 'AWSPREVIOUS'
          }
        }
      })
      await client.fetchString('mySecretString')

      expect(getSpy).toBeCalledWith({ SecretId: 'mySecretString', VersionId: previousVersionId })
    })
  })

  describe('fetchString', () => {
    it('returns the expected string from a SecretString', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)
      const secret = await client.fetchString('mySecretString')
      expect(secret).toEqual(textSecret)
    })

    it('returns the expected string from a SecretBinary', async () => {
      getSpy.mockImplementation(async () => responses.mySecretBinary)
      const secret = await client.fetchString('mySecretBinary')
      expect(secret).toEqual(textSecret)
    })

    it('passes down the versionId if provided', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      await client.fetchString('mySecretString', { versionId: previousVersionId })

      expect(getSpy).toBeCalledWith('mySecretString', { versionId: previousVersionId })
    })

    it('passes down the versionStage if provided', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      await client.fetchString('mySecretString', { versionStage: 'AWSPREVIOUS' })

      expect(getSpy).toBeCalledWith('mySecretString', { versionStage: 'AWSPREVIOUS' })
    })

    it('throws an error on a missing secret', async () => {
      getSpy.mockImplementation(async () => null)
      const promise = client.fetchString('not-a-real-secret')
      await expect(promise).rejects.toThrow("can't find the specified secret")
    })

    it('throws an error if AWS returns an invalid response', async () => {
      getSpy.mockImplementation(async () => ({}))

      const promise = client.fetchString('awsDoneMessedUp')

      await expect(promise).rejects.toThrow(Error)
    })
  })

  describe('fetchJSON', () => {
    it('returns the expected JSON from a SecretString', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)
      const secret = await client.fetchJSON<Credential>('mySecretString')
      expect(secret).toEqual(jsonSecret)
    })

    it('returns the expected JSON from a SecretBinary', async () => {
      getSpy.mockImplementation(async () => responses.mySecretBinary)
      const secret = await client.fetchJSON<Credential>('mySecretBinary')
      expect(secret).toEqual(jsonSecret)
    })

    it('passes down the versionId if provided', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      await client.fetchJSON('mySecretString', { versionId: previousVersionId })

      expect(getSpy).toBeCalledWith('mySecretString', { versionId: previousVersionId })
    })

    it('passes down the versionStage if provided', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      await client.fetchJSON('mySecretString', { versionStage: 'AWSPREVIOUS' })

      expect(getSpy).toBeCalledWith('mySecretString', { versionStage: 'AWSPREVIOUS' })
    })

    it('throws the original JSON parse exception on invalid JSON', async () => {
      getSpy.mockImplementation(async () => responses.myInvalidJson)
      const promise = client.fetchJSON<Credential>('myInvalidJson')
      expect(promise).rejects.toThrow(SyntaxError)
    })

    it('throws a NotFoundError on a missing secret', async () => {
      getSpy.mockImplementation(async () => null)
      const promise = client.fetchJSON<Credential>('not-a-real-secret')
      await expect(promise).rejects.toThrow("can't find the specified secret")
    })
  })

  describe('fetchBuffer', () => {
    it('returns the expected string from a SecretString', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      const secret = await client.fetchBuffer('mySecretString')

      expect(secret).toBeInstanceOf(Buffer)
      expect(secret.toString()).toEqual(textSecret)
    })

    it('returns the expected string from a SecretBinary', async () => {
      getSpy.mockImplementation(async () => responses.mySecretBinary)

      const secret = await client.fetchBuffer('mySecretBinary')

      expect(secret).toBeInstanceOf(Buffer)
      expect(secret.toString()).toEqual(textSecret)
    })

    it('passes down the versionId if provided', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      await client.fetchBuffer('mySecretString', { versionId: previousVersionId })

      expect(getSpy).toBeCalledWith('mySecretString', { versionId: previousVersionId })
    })

    it('passes down the versionStage if provided', async () => {
      getSpy.mockImplementation(async () => responses.mySecretString)

      await client.fetchBuffer('mySecretString', { versionStage: 'AWSPREVIOUS' })

      expect(getSpy).toBeCalledWith('mySecretString', { versionStage: 'AWSPREVIOUS' })
    })

    it('throws a NotFoundError on a missing secret', async () => {
      getSpy.mockImplementation(async () => null)

      const promise = client.fetchBuffer('not-a-real-secret')

      await expect(promise).rejects.toThrow("can't find the specified secret")
    })

    it('throws an error if AWS returns an invalid response', async () => {
      getSpy.mockImplementation(async () => ({}))

      const promise = client.fetchBuffer('awsDoneMessedUp')

      await expect(promise).rejects.toThrow(Error)
    })
  })
})
