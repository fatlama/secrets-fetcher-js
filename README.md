# secrets-fetcher

Provides a simplified interface for fetching secrets from AWS Secrets Manager.

## Background

The AWS SDK for JavaScript provides the basic client stubs for fetching secrets from Secrets Manager, however the API
only provides the barebone methods around running in JavaScript that don't quite feel native. This library aims to
abstract out the calls to AWS Secrets Manager behind a native-feeling JS library, complete with TypeScript, data-type
specific fetch operations, and first-class promises.

Additionally, this library handles caching secrets in-memory to reduce the calls made to AWS Secrets Manager while
still allowing upstream clients to fetch different VersionStages of a secret (useful for handling secret rotation
without restarting services).

Finally, the library provides TypeScript definitions and a mock client to make compile-time checks and tests easier.

## Getting started

You will need to initialize an instance of SecretsClient and then use the instance methods.

By default the client will attempt to initialize a default AWS.SecretsManager client and set up a cache with sane
defaults.

```
// lib/clients/secrets-fetcher.ts
import { AWSSecretsClient, MockSecretsClient, SecretsClient } from '@fatlama/secrets-fetcher'
...

export default function createClient(): SecretsClient {
  if (isTest) {
    return new MockSecretsClient()
  }

  return new AWSSecretsClient()
}
```

## Methods

Once initialized you can use the following methods to retrieve secrets:

### `fetchJSON<T=any>`

Fetches a secret and attempts to parse it as JSON. Optionally allows you to specify a TypeScript object (note: as with
all TypeScript the value is not checked at runtime).

```
> const secret = await client.fetchJSON<CredentialPair>('/path/to/secret')
{
  username: 'myusername',
  password: 's00perSekr3t'
}
```

### `fetchString`

Fetches a secret and returns it as a string, regardless if it was stored as a Base64 encoded `SecretBinary` or
`SecretString`

```
> const secret = await client.fetchString('/path/to/secret')
'{"username":"myusername","password":"s00perSekr3t"}'
```

### `fetchBuffer`

Fetches a secret and returns it as a Buffer, regardless if it was stored as a Base64 encoded `SecretBinary` or
`SecretString`. Useful when you need to fetch binary data, such as a certificate

```
> const secret = await client.fetchBuffer('/path/to/secret')
<Buffer ...>
> buffer.toString()
'{"username":"myusername","password":"s00perSekr3t"}'
> JSON.parse(buffer)
{ username: 'myusername', password: 's00perSekr3t' }
```

### Fetch Options

All fetch operations support the following options as the second argument:

* versionStage: Fetch the VersionId mapped to the specified stage (defaults to `AWSCURRENT`)
* versionId: Fetch the specified VersionId
* force: Force a cache miss and send a new request to AWS Secrets Manager

NOTE: The mock client will ignore these parameters

```
// fetch the last version of the secret (useful for supporting automatic secret rotations)
const oldCreds = await client.fetchJSON<CredentialPair>('/path/to/secret', { versionStage: 'AWSPREVIOUS' })

// force the secret to be re-cached (perhaps when a rotation happens on a specific scheduled time)
const creds = await client.fetchJSON<CredentialPair>('/path/to/secret', { force: true })
```

## Configuration Options

* awsClient: Use the provided AWS Secrets Manager client instead of creating a new default
* secretsCache: Use the provided secrets cache instead of creating a new default
* cacheConfig: Configure the underlying cache (uses `@fatlama/fl-secretsmanager-caching`

```
import * as AWS from 'aws-sdk'
import { AWSSecretsClient, SecretsClient } from '@fatlama/secrets-fetcher'
...

const awsClient = new AWS.SecretsManager({ ... })
const client: SecretsClient = new AWSSecretsClient({
  awsClient,
  cacheConfig: {
    config: {
      maxCacheSize: 128,
      secretRefreshInterval: 60 * 30 * 1000 // 30 minutes instead of the default 60 minutes
    }
  }
})
```

## Mock Client

This package provides a mock client that can be initialized with responses for mocking out calls to AWS Secrets Manager.

```
import { MockSecretsClient, SecretsClient } from '@fatlama/secrets-fetcher'

const client: SecretsClient = new MockSecretsClient({
  '/path/to/secret': '{"username":"myusername","password":"s00perSekr3t"}'
})

...

it('fetches the expected secret', async () => {
  const val = await client.fetchJSON('/path/to/secret')
  expect(val.username).toEqual('myusername')
})

it('throws an error on a missing secret', async () => {
  const promise = client.fetchJSON('/does/not/exist')
  expect(promise).rejects.toThrow(/not found/)
})
```

## Contributing

* To just run tests: `yarn test`
* To format the code using prettier: `yarn format`
* To run the entire build process: `yarn release`

## Publishing to NPM

Use the built-in `npm version {patch|minor}` tool to increment the version number and trigger a release

```
$ git checkout -b release-1.0.1
$ npm version patch -m "Your release message here"
$ git push --tag
```

Once approved you should be able to merge into master. This will trigger a test-build-release flow in Circle CI. You
will need to press the `confirm_publish` step and approve the publish.

NOTE: CircleCI will only listen for tags matching vX.Y.Z with any optional suffixes
