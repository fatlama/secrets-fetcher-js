import { SecretsClient } from './types'
import { NotFoundError } from './errors'

interface MockResponses {
  [key: string]: string
}

interface MockSecretsOpts {
  responses: MockResponses
}

export class MockSecretsClient implements SecretsClient {
  private _responses: MockResponses

  public constructor(opts: Partial<MockSecretsOpts> = {}) {
    this._responses = opts.responses || {}
  }

  public async fetchJSON<T>(secretId: string): Promise<T> {
    const secret = this._getSecret(secretId)
    return JSON.parse(secret)
  }

  public async fetchString(secretId: string): Promise<string> {
    return this._getSecret(secretId)
  }

  public async fetchBuffer(secretId: string): Promise<Buffer> {
    const secret = this._getSecret(secretId)
    return Buffer.from(secret)
  }

  private _getSecret(secretId: string): string {
    const secret = this._responses[secretId]
    if (!secret) {
      throw new NotFoundError("can't find the specified secret")
    }

    return secret
  }
}
