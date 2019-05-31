import { MockSecretsClient } from '../mock-secrets-client'
import { NotFoundError } from '../errors'

interface Credential {
  username: string
  password: string
}

describe('MockSecretsClient', () => {
  let client: MockSecretsClient

  const jsonSecret = {
    username: 'kitty',
    password: 's00perSekr3t'
  }

  const textSecret = JSON.stringify(jsonSecret)

  const responses: { [key: string]: string } = {
    mySecretString: textSecret,
    myInvalidJson: 'not-valid-json'
  }

  beforeEach(() => {
    client = new MockSecretsClient({ responses })
  })

  describe('constructor', () => {
    it('allows for no responses to be set', async () => {
      const client = new MockSecretsClient()
      const promise = client.fetchString('mySecretString')
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })

  describe('fetchString', () => {
    it('returns the expected string', async () => {
      const secret = await client.fetchString('mySecretString')
      expect(secret).toEqual(textSecret)
    })

    it('throws the original NotFoundError on a missing secret', async () => {
      const promise = client.fetchString('not-a-real-secret')
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })

  describe('fetchJSON', () => {
    it('returns the expected JSON', async () => {
      const secret = await client.fetchJSON<Credential>('mySecretString')
      expect(secret).toEqual(jsonSecret)
    })

    it('throws the original JSON parse exception on invalid JSON', async () => {
      const promise = client.fetchJSON<Credential>('myInvalidJson')
      expect(promise).rejects.toThrow(SyntaxError)
    })

    it('throws the original NotFoundError on a missing secret', async () => {
      const promise = client.fetchJSON<Credential>('not-a-real-secret')
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })

  describe('fetchBuffer', () => {
    it('returns the expected string', async () => {
      const secret = await client.fetchBuffer('mySecretString')
      expect(secret).toBeInstanceOf(Buffer)
      expect(secret.toString()).toEqual(textSecret)
    })

    it('throws the original NotFoundError on a missing secret', async () => {
      const promise = client.fetchBuffer('not-a-real-secret')
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })
})
