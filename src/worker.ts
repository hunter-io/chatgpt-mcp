// Keep the Cloudflare Worker entrypoint's export surface limited to the
// supported default handler. src/index.ts retains helper exports for tests.
import worker from "./index"

export default worker
