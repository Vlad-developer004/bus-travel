export default async function globalTeardown() {
  await (globalThis as any).__LOCAL_PG__?.stop();
}
