# Friction

Only what happened while building this.

1. **Faucet before any write.** The relayer wallet started with 0 tGLM (`eth_getBalance` returned `0x0`). No write can run until someone claims tGLM at the faucet by hand. The faucet needs a browser; an agent cannot do it.
2. **Access key is another manual step.** The docs say the public RPC is "heavily rate limited" and that `rabdi({ accessKey: "" })` logs a warning. Getting a key needs a login at the Hub. We built and tested reads on the public RPC first. The SDK prints the warning on every process start.
3. **Doc paths.** `docs.arkiv.network/<page>.md` works for some pages (for example `writing/create`) but `writing/update` and `writing/delete` return a 404 page with HTTP 200. The real page is `writing/change`. `llms.txt` lists the correct paths and is the better entry point.
4. **No `updateEntity`.** Updating is `patchEntity` (named columns only) plus a separate `extendEntity` for expiry. A "save" is two transactions, so we serialise writes on the server.
5. **Explorer deep link not documented.** The docs give the explorer home (`rabdi.explorer.arkiv.network`) but no URL pattern for one entity. The explorer is a single-page app that answers HTTP 200 for any path, so we could not check a link by fetching it. We use `/entity/<key>`; see the live test note below.
6. **Entity data is public and anyone can write our schema name.** The docs say so, and it changed our design: reads must pin `createdBy(relayer)` and the owner column.
7. **tsx and top-level await.** A script with top-level `await` failed in `tsx` with `ERR_REQUIRE_ASYNC_MODULE` because the project is CommonJS. We wrapped it in an async function. Not an Arkiv bug.
