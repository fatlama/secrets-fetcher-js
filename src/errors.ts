export class NotFoundError extends Error {
  public code: string

  public constructor(message?: string) {
    super(message)
    this.code = 'ResourceNotFoundException'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}
