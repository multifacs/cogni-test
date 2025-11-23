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

**Initialize db**

```shell
npm run init-db
```

**Run dev with --host**

```shell
npm run host
```

**Build for prod**

```shell
npm run build-prod
```

**Start prod app**

```shell
npm run start
```

**Up Docker Compose**

```shell
docker compose up -d --build
```
