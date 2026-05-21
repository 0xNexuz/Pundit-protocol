# Pundit Protocol Deployment Guide

This project has two parts:

- `contracts`: Hardhat smart contracts deployed to X Layer testnet
- `frontend`: Vite/React app connected to the deployed contracts

## Current X Layer Testnet Contracts

```txt
REGISTRY_ADDRESS=0x6FB454e649376482AF54b1d7B4E2615C6b853fC4
TRACKER_ADDRESS=0xAaA41edfd73A45D734bF13264cBe7413c611d2f7
SUBSCRIPTION_ADDRESS=0x7b0d4E922916AEa5cDE60f93b07920168DC18Bb9
```

The frontend uses these addresses in:

```txt
frontend/src/protocol.ts
```

## Where The ABI Comes From

Hardhat writes ABI files after compile. Each artifact JSON has an `abi` field.

```powershell
cd C:\Users\USER\pundit-protocol\contracts
npx.cmd hardhat compile
```

ABI artifact files:

```txt
contracts/artifacts/contracts/PredictionRegistry.sol/PredictionRegistry.json
contracts/artifacts/contracts/AccuracyTracker.sol/AccuracyTracker.json
contracts/artifacts/contracts/PunditSubscription.sol/PunditSubscription.json
```

PowerShell example:

```powershell
(Get-Content .\artifacts\contracts\PredictionRegistry.sol\PredictionRegistry.json | ConvertFrom-Json).abi
```

The frontend currently uses compact human-readable ABIs in `frontend/src/protocol.ts`.

## Test Locally

```powershell
cd C:\Users\USER\pundit-protocol\frontend
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:5173
```

Build check:

```powershell
npm run build
```

## Push Full Project To GitHub

From the project root:

```powershell
cd C:\Users\USER\pundit-protocol
git init
git add .
git commit -m "Initial Pundit Protocol app"
```

Create a new empty GitHub repository, then connect it:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pundit-protocol.git
git push -u origin main
```

If Git asks who you are:

```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
```

Do not commit private keys. Keep `contracts/.env` ignored.

## Deploy Frontend To Vercel

If Vercel shows `404: NOT_FOUND`, it usually means the deployment is pointed at the repo root without serving the Vite build output. This repo now includes:

```txt
vercel.json
frontend/vercel.json
```

These files tell Vercel how to build and serve the app.

### Option 1: Vercel Dashboard

1. Push the project to GitHub.
2. Go to Vercel and import the GitHub repository.
3. Set the root directory to:

```txt
frontend
```

4. Use these settings:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. Deploy.

If the project already exists and shows `404: NOT_FOUND`:

1. Open the Vercel project dashboard.
2. Go to `Settings`.
3. Open `Build and Development Settings`.
4. Set `Root Directory` to:

```txt
frontend
```

5. Confirm these values:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

6. Go to `Deployments`.
7. Click the latest deployment menu.
8. Click `Redeploy`.

### Option 2: Vercel CLI

Install and log in:

```powershell
npm install -g vercel
vercel login
```

Deploy:

```powershell
cd C:\Users\USER\pundit-protocol\frontend
vercel
```

For production:

```powershell
vercel --prod
```

When Vercel asks:

```txt
Set up and deploy? yes
Which scope? your account
Link to existing project? no
Project name? pundit-protocol
Directory? ./
Build command? npm run build
Output directory? dist
Development command? npm run dev
```

## After Deployment

Open the Vercel URL and connect MetaMask. The app should ask to switch or add X Layer Testnet.

X Layer Testnet details used by the frontend:

```txt
Chain ID: 1952
Hex Chain ID: 0x7a0
RPC URL: https://testrpc.xlayer.tech/terigon
Currency: OKB
Explorer: https://www.okx.com/web3/explorer/xlayer-test
```
