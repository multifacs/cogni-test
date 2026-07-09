# inline-onnx Vite Plugin

## Purpose

The `inline-onnx` plugin (defined in `vite.config.ts`) embeds ONNX model files directly into the JavaScript bundle at build time as base64 strings. This eliminates the need for runtime file path resolution, which is problematic in SvelteKit production builds because:

- The build output structure (``.svelte-kit/output/server/chunks/``) differs from the source layout
- ``import.meta.url`` resolves to chunk paths where model files don't exist
- No ONNX files are copied to the build output by default

## How It Works

### Build Time

1. An import like `import data from 'virtual:inline-onnx/./models/file.onnx'` triggers the plugin's `resolveId` hook
2. The plugin resolves the relative path against the importing file's directory, producing an absolute path
3. The `load` hook reads the binary file and converts it to a base64 string constant: `export default "<base64>";`
4. This string gets bundled into the JS output — no external file needed at runtime

### Runtime

The consuming code decodes the base64 string back into a `Buffer`:

```ts
import baggingBase64 from 'virtual:inline-onnx/./models/Bagging_age_predictor.onnx';
// ...
const buffer = Buffer.from(baggingBase64, 'base64');
const session = await InferenceSession.create(buffer);
```

## Import Syntax

```
virtual:inline-onnx/<relative-path-from-importing-file>
```

The relative path is resolved from the file that contains the import statement, just like a normal relative import.

Example — from `src/lib/server/age/runAgeModel.ts`:

```ts
import baggingBase64 from 'virtual:inline-onnx/./models/Bagging_age_predictor.onnx';
```

This resolves to `src/lib/server/age/models/Bagging_age_predictor.onnx`.

## Limitations

- **Binary size**: The base64 encoding increases the payload by ~33%. For small models (<1MB) this is negligible. For large models, consider alternatives like copying files at deploy time.
- **No hot-reload**: Changing an `.onnx` file requires a dev server restart since the content is baked in at build time.
- **Server-side only**: This plugin is intended for server code. Browser bundles would need a different approach (e.g., fetching from `static/`).

## Adding a New Model

1. Place the `.onnx` file under `src/lib/server/age/models/`
2. Add an import in your server code:
   ```ts
   import myModelBase64 from 'virtual:inline-onnx/./models/my_model.onnx';
   ```
3. Decode at runtime:
   ```ts
   const buffer = Buffer.from(myModelBase64, 'base64');
   const session = await InferenceSession.create(buffer);
   ```
4. Rebuild (`npm run build`)