# Cogni-Test

## Run scripts

**Install**

```shell
npm i
```

**Initialize db in prod**

```shell
npm run init-db
```

**Initialize db in dev**

```shell
npm run init-db-dev
```

**Run dev**

```shell
npm run dev
```

**Run dev with --host**

```shell
npm run host
```

**Build for prod**

```shell
npm run build
```

**Start prod app**

```shell
npm run start
```

**Up Docker Compose**

```shell
docker compose up -d --build
```

## Testing

**Install deps**

```shell
npm i
npx playwright install --with-deps # install playwright deps for browser tests
```

**Run tests**

```shell
npm run test
```

Client side tests expected to be in `src/**/*.svelte.{test,spec}.{js,ts}`
files. Server side tests expected to be in `src/**/*.{test,spec}.{js,ts}` files.

There is an example of a client side test in
[`src/lib/exercises/word-morphing/components/Result.svelte.spec.ts`](src/lib/exercises/word-morphing/components/Result.svelte.spec.ts).
