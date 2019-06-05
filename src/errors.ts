export class NotFoundError extends Error {
  public code: string

  public constructor(message?: string) {
    super(message)
    this.name = 'NotFoundError' // reset the name back after calling super()
    this.code = 'ResourceNotFoundException'
  }
}
