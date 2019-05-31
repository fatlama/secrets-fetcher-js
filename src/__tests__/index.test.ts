import * as index from '../index'
import { AWSSecretsClient } from '../aws-secrets-client'

describe('index', () => {
  it('exports AWSSecretsClient', () => {
    expect(index.AWSSecretsClient).toEqual(AWSSecretsClient)
  })
})
