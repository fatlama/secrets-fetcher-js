import * as index from '../index'
import { SecretsClient } from '../secrets-client'

describe('index', () => {
  it('exports SecretsClient', () => {
    expect(index.SecretsClient).toEqual(SecretsClient)
  })
})
