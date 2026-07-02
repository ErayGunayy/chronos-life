export class LifeEventValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'LifeEventValidationError';
    this.field = field;
  }
}
