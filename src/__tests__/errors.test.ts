import { NotFoundError } from '../errors'

describe('errors', () => {
  it('craves 100% code coverage (but could not be achieved :( )', () => {
    const error = new NotFoundError('uh oh')
    expect(error.code).toEqual('ResourceNotFoundException')
    expect(error.message).toEqual('uh oh')
  })
})
