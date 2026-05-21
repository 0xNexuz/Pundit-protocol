# Pundit Protocol

Pundit Protocol is a prediction and subscription dApp deployed on X Layer Testnet. Users can submit match predictions, subscribe to pundits, and view on-chain accuracy stats.

## Live Contracts

X Layer Testnet:

```txt
REGISTRY_ADDRESS=0x6FB454e649376482AF54b1d7B4E2615C6b853fC4
TRACKER_ADDRESS=0xAaA41edfd73A45D734bF13264cBe7413c611d2f7
SUBSCRIPTION_ADDRESS=0x7b0d4E922916AEa5cDE60f93b07920168DC18Bb9
```

## Tech Stack

- Solidity
- Hardhat
- React
- Vite
- TypeScript
- Ethers.js
- X Layer Testnet
- Vercel

## Project Structure

```txt
pundit-protocol/
  contracts/
    contracts/
      PredictionRegistry.sol
      AccuracyTracker.sol
      PunditSubscription.sol
    scripts/
      deploy.js
    hardhat.config.ts

  frontend/
    src/
      App.tsx
      protocol.ts
      App.css
      index.css
    package.json

  DEPLOYMENT.md
  README.md
```

## Smart Contracts

### PredictionRegistry

Stores match predictions from pundits.

Main functions:

- `submitPrediction`
- `getPunditPrediction`
- `getPredictionsForMatch`
- `hasPredicted`

### AccuracyTracker

Tracks prediction accuracy after matches are resolved.

Main functions:

- `resolveMatch`
- `gradePundit`
- `getAccuracy`
- `stats`

### PunditSubscription

Lets pundits set monthly subscription prices and lets users subscribe.

Main functions:

- `setSubscriptionPrice`
- `subscribe`
- `isSubscribed`
- `withdrawEarnings`
- `punditMonthlyPrice`

## X Layer Testnet Details

```txt
Network Name: X Layer Testnet
Chain ID: 1952
Hex Chain ID: 0x7a0
RPC URL: https://testrpc.xlayer.tech/terigon
Native Currency: OKB
Explorer: https://www.okx.com/web3/explorer/xlayer-test
```

## Frontend Features

The frontend is a protocol control panel that supports:

- Connect wallet
- Switch or add X Layer Testnet
- Submit match predictions
- Load match predictions
- Set pundit subscription price
- Subscribe to a pundit
- Check subscription access
- Resolve matches
- Grade pundits
- View accuracy stats
- Withdraw earnings
- Smooth section reveal animations

## Local Setup

Clone the repository:

```powershell
git clone https://github.com/YOUR_USERNAME/pundit-protocol.git
cd pundit-protocol
```

Install frontend dependencies:

```powershell
cd frontend
npm install
```

Run the frontend:

```powershell
npm run dev
```

Open:

```txt
http://127.0.0.1:5173
```

Build the frontend:

```powershell
npm run build
```

## Contracts Setup

Install contract dependencies:

```powershell
cd ../contracts
npm install
```

Create a `.env` file inside `contracts/`:

```env
PRIVATE_KEY=your_wallet_private_key
XLAYER_RPC_URL=https://testrpc.xlayer.tech
```

Compile contracts:

```powershell
npx.cmd hardhat compile
```

Deploy to X Layer Testnet:

```powershell
npx.cmd hardhat run scripts\deploy.js --network xlayer
```

Never commit your `.env` file or private key.

## Getting The ABI

Hardhat stores ABI data inside contract artifacts after compilation.

Artifact files:

```txt
contracts/artifacts/contracts/PredictionRegistry.sol/PredictionRegistry.json
contracts/artifacts/contracts/AccuracyTracker.sol/AccuracyTracker.json
contracts/artifacts/contracts/PunditSubscription.sol/PunditSubscription.json
```

PowerShell example:

```powershell
(Get-Content .\artifacts\contracts\PredictionRegistry.sol\PredictionRegistry.json | ConvertFrom-Json).abi
```

The frontend uses compact human-readable ABIs in:

```txt
frontend/src/protocol.ts
```

## Push To GitHub

From the project root:

```powershell
cd C:\Users\USER\pundit-protocol
git init
git add .
git commit -m "Initial Pundit Protocol app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pundit-protocol.git
git push -u origin main
```

If Git asks for your identity:

```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
```

## Deploy Frontend To Vercel

If you see Vercel `404: NOT_FOUND`, check that Vercel is building the frontend folder and serving `dist`.

### Vercel Dashboard

1. Push the project to GitHub.
2. Open Vercel.
3. Import the GitHub repository.
4. Set the root directory to:

```txt
frontend
```

5. Use these settings:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

6. Deploy.

If the project was already imported with the wrong settings:

1. Open the Vercel project dashboard.
2. Go to `Settings`.
3. Go to `Build and Development Settings`.
4. Set `Root Directory` to `frontend`.
5. Redeploy from the latest commit.

### Vercel CLI

Install the Vercel CLI:

```powershell
npm install -g vercel
vercel login
```

Deploy from the frontend folder:

```powershell
cd C:\Users\USER\pundit-protocol\frontend
vercel
```

Deploy to production:

```powershell
vercel --prod
```

## Important Notes

- Keep private keys out of GitHub.
- The frontend should only contain public contract addresses and ABI data.
- Users need testnet OKB to submit transactions.
- `resolveMatch` can only be called by the owner of `AccuracyTracker`.
- If contracts are redeployed, update the addresses in `frontend/src/protocol.ts`.

## License

MIT
