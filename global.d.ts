declare module '*?raw' {
  const content: string;
  export default content;
}

// dans global.d.ts
declare module '*.css?raw' {
  const content: string;
  export default content;
}

// TS6 enables noUncheckedSideEffectImports by default; allow side-effect CSS imports
declare module '*.css';