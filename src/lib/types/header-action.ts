// DEV-only action slot for the top banner (see task 2.2: playground
// pages register an "Автопрохождение" button via the headerText context).
// Shared leaf module: types only, no runtime imports — both the (app)
// layout (context owner) and Header (consumer) import from here without
// creating a route ↔ component cycle.
export type DevAction = { label: string; onclick: () => Promise<void> } | null;
