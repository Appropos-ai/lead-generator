import { Effect, Schema } from "effect"

export class InvalidParamError extends Schema.TaggedError<InvalidParamError>()("InvalidParamError", {
  message: Schema.String,
}) {
  readonly status = 400
}

export function parseIntParam(value: string, paramName: string): Effect.Effect<number, InvalidParamError> {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    return Effect.fail(new InvalidParamError({ message: `Invalid ${paramName}: must be a positive integer` }))
  }
  return Effect.succeed(n)
}
