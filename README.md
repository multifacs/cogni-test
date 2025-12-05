# Cogni-Test Monorepo

## Modules:

- Main app cogni-test (apps/cogni-test)
- Secondary app cogni-rhythm (apps/cogni-rhythm)
- Nginx web-server (nginx)
- Auxiliary scripts (scripts)

## Run scripts

**Install**

```shell
npm i
```

**Initialize db in prod**

```shell
npm run init-db -w .\apps\cogni-test\
```

**Initialize db in dev**

```shell
npm run init-db-dev -w .\apps\cogni-test\
```

**Run dev**

```shell
npm run dev -w .\apps\cogni-test\
```

**Run dev with --host**

```shell
npm run host -w .\apps\cogni-test\
```

**Build for prod**

```shell
npm run build -w .\apps\cogni-test\
```

**Start prod app**

```shell
npm run start -w .\apps\cogni-test\
```

**Up Docker Compose**

```shell
docker compose up -d --build
```

## Testing

For now available only in apps/cogni-test

**Install deps**

```shell
npm i
npx playwright install --with-deps # install playwright deps for browser tests
```

**Run tests**

```shell
npm run test -w .\apps\cogni-test\
```

Client side tests expected to be in `src/**/*.svelte.{test,spec}.{js,ts}`
files. Server side tests expected to be in `src/**/*.{test,spec}.{js,ts}` files.

There is an example of a client side test in
[`apps/congi-test/src/routes/page.svelte.spec.ts`](/apps/cogni-test/src/routes/page.svelte.spec.ts).
