import { MockSecretsClient, NotFoundError } from '../mock-secrets-client'

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

  describe('fetchString', () => {
    it('returns the expected string', async () => {
      const secret = await client.fetchString({ secretId: 'mySecretString' })
      expect(secret).toEqual(textSecret)
    })

    it('throws the original NotFoundError on a missing secret', async () => {
      const promise = client.fetchString({ secretId: 'not-a-real-secret' })
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })

  describe('fetchJSON', () => {
    it('returns the expected JSON', async () => {
      const secret = await client.fetchJSON<Credential>({ secretId: 'mySecretString' })
      expect(secret).toEqual(jsonSecret)
    })

    it('throws the original JSON parse exception on invalid JSON', async () => {
      const promise = client.fetchJSON<Credential>({ secretId: 'myInvalidJson' })
      expect(promise).rejects.toThrow(SyntaxError)
    })

    it('throws the original NotFoundError on a missing secret', async () => {
      const promise = client.fetchJSON<Credential>({ secretId: 'not-a-real-secret' })
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })

  describe('fetchBuffer', () => {
    it('returns the expected string', async () => {
      const secret = await client.fetchBuffer({ secretId: 'mySecretString' })
      expect(secret).toBeInstanceOf(Buffer)
      expect(secret.toString()).toEqual(textSecret)
    })

    it('throws the original NotFoundError on a missing secret', async () => {
      const promise = client.fetchBuffer({ secretId: 'not-a-real-secret' })
      await expect(promise).rejects.toThrow(NotFoundError)
    })
  })
})
