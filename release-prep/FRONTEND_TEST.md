# Isolated frontend verification

This smoke script refuses the historical production contract. Run it only against the new test contract after deployment.

In a fresh PowerShell window, set process-only values (do not edit `.env` or Vercel):

```powershell
$env:NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS = "<new Studionet test address>"
$env:NEXT_PUBLIC_ENTREW_CHAIN_ID = "61999"
$env:NEXT_PUBLIC_ENTREW_RPC = "https://studio.genlayer.com/api"
npm run dev -- --hostname 127.0.0.1 --port 3100
```

In a second window, set the same process variables plus the published test program/entry IDs when available, then run:

```powershell
node release-prep/frontend-live-smoke.mjs
```

This checks direct URL reload and six viewport widths in Playwright Chromium. It also inspects each `gen_call`: every read must target the supplied test address and request `latest-final`. It does not use or modify the production Vercel deployment and does not test wallet signing. Real wallet connect/switch/sign behavior requires manual approval in the authorized wallet.
