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
