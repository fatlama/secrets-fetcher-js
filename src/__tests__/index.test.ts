import * as index from '../index'
import { AWSSecretsClient } from '../aws-secrets-client'
import { MockSecretsClient } from '../mock-secrets-client'

describe('index', () => {
  it('exports AWSSecretsClient', () => {
    expect(index.AWSSecretsClient).toEqual(AWSSecretsClient)
  })

  it('exports MockSecretsClient', () => {
    expect(index.MockSecretsClient).toEqual(MockSecretsClient)
  })
})
