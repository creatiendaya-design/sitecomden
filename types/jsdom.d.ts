// jsdom ships no type declarations and we only use it (dynamically) to
// sanitize uploaded SVGs in lib/media/sanitize-svg.ts. A loose ambient module
// declaration is enough; that file treats the DOM surface as `any`.
declare module "jsdom";
