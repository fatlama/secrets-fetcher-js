import { SecretsClient, FetchOpts } from './types'

interface MockResponses {
  [key: string]: string
}

interface MockSecretsOpts {
  responses: MockResponses
}

export class NotFoundError extends Error {
  public code?: string

  public constructor(message?: string) {
    super(message)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class MockSecretsClient implements SecretsClient {
  private _responses: MockResponses

  public constructor(opts: Partial<MockSecretsOpts> = {}) {
    this._responses = opts.responses || {}
  }

  public async fetchJSON<T>(fetchOpts: FetchOpts): Promise<T> {
    const secret = this._getSecret(fetchOpts)
    return JSON.parse(secret)
  }

  public async fetchString(fetchOpts: FetchOpts): Promise<string> {
    return this._getSecret(fetchOpts)
  }

  public async fetchBuffer(fetchOpts: FetchOpts): Promise<Buffer> {
    const secret = this._getSecret(fetchOpts)
    return Buffer.from(secret)
  }

  private _getSecret(fetchOpts: FetchOpts): string {
    const { secretId } = fetchOpts

    const secret = this._responses[secretId]
    if (!secret) {
      const error = new NotFoundError("can't find the specified secret")
      error.code = 'ResourceNotFoundException'

      throw error
    }

    return secret
  }
}
