# Why Arkiv

Delulu is a private AI diary. Her memory lives encrypted on her device, so a lost phone would lose her diary. She needs a backup, but we do not want a server database that holds her data.

Arkiv fits this job:

- **No Delulu database.** The backup is a locked blob on a public, queryable store. We run no table of users and no storage bucket. We can lose our server and she can still restore.
- **Queryable by attribute.** She finds her own backup by `user` address, with the creator pinned to our relayer. No index of our own.
- **It expires.** Every entity must have an expiry. A backup she stops renewing goes away by itself after about 182 days. For a diary this is the right default: no forever archive of someone who left.
- **Renewal is a save.** Each normal save extends the expiry, so active users never think about it.
- **Public is acceptable only because it is encrypted.** The blob is AES-256-GCM ciphertext under a key made from her wallet signature. The honest limit: anyone can see the blob, her wallet address and the save times. Nobody can read her words without her key.

What Arkiv does not give us: privacy of metadata, and deletion of history on the chain. We say so in the app.
