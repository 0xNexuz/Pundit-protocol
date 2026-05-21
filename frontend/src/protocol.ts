import { BrowserProvider, Contract, parseEther } from 'ethers'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export const XLAYER_TESTNET = {
  chainId: '0x7a0',
  chainName: 'X Layer Testnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: ['https://testrpc.xlayer.tech/terigon', 'https://testrpc.xlayer.tech'],
  blockExplorerUrls: ['https://www.okx.com/web3/explorer/xlayer-test'],
}

export const CONTRACT_ADDRESSES = {
  registry: '0x6FB454e649376482AF54b1d7B4E2615C6b853fC4',
  tracker: '0xAaA41edfd73A45D734bF13264cBe7413c611d2f7',
  subscription: '0x7b0d4E922916AEa5cDE60f93b07920168DC18Bb9',
}

export const predictionRegistryAbi = [
  'function submitPrediction(string _matchId, uint8 _predictedOutcome, uint256 _kickoffTime) external',
  'function getPunditPrediction(string _matchId, address _pundit) external view returns (uint8)',
  'function getPredictionsForMatch(string _matchId) external view returns (tuple(address pundit,string matchId,uint8 predictedOutcome,uint256 timestamp)[])',
  'function hasPredicted(string _matchId, address _pundit) external view returns (bool)',
  'event PredictionLogged(address indexed pundit, string matchId, uint8 predictedOutcome, uint256 timestamp)',
]

export const accuracyTrackerAbi = [
  'function resolveMatch(string _matchId, uint8 _actualOutcome) external',
  'function gradePundit(string _matchId, address _pundit) external',
  'function getAccuracy(address _pundit) external view returns (uint256)',
  'function matchResolved(string _matchId) external view returns (bool)',
  'function matchOutcomes(string _matchId) external view returns (uint8)',
  'function stats(address _pundit) external view returns (uint256 wins, uint256 losses, uint256 totalResolved)',
  'event MatchResolved(string matchId, uint8 outcome)',
  'event PunditGraded(address indexed pundit, string matchId, bool won)',
]

export const punditSubscriptionAbi = [
  'function setSubscriptionPrice(uint256 _priceInWei) external',
  'function subscribe(address _pundit) external payable',
  'function isSubscribed(address _subscriber, address _pundit) external view returns (bool)',
  'function withdrawEarnings() external',
  'function punditMonthlyPrice(address _pundit) external view returns (uint256)',
  'function balances(address _pundit) external view returns (uint256)',
  'event PriceUpdated(address indexed pundit, uint256 newPrice)',
  'event Subscribed(address indexed subscriber, address indexed pundit, uint256 expiry)',
  'event FundsWithdrawn(address indexed pundit, uint256 amount)',
]

export async function ensureXLayerTestnet() {
  if (!window.ethereum) {
    throw new Error('Install MetaMask or another injected wallet first.')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: XLAYER_TESTNET.chainId }],
    })
  } catch (error) {
    const switchError = error as { code?: number }
    if (switchError.code !== 4902) {
      throw error
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [XLAYER_TESTNET],
    })
  }
}

export async function getSigner() {
  if (!window.ethereum) {
    throw new Error('Install MetaMask or another injected wallet first.')
  }

  await ensureXLayerTestnet()
  const provider = new BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  return provider.getSigner()
}

export async function getProtocolContracts() {
  const signer = await getSigner()

  return {
    signer,
    registry: new Contract(CONTRACT_ADDRESSES.registry, predictionRegistryAbi, signer),
    tracker: new Contract(CONTRACT_ADDRESSES.tracker, accuracyTrackerAbi, signer),
    subscription: new Contract(
      CONTRACT_ADDRESSES.subscription,
      punditSubscriptionAbi,
      signer,
    ),
  }
}

export function okbToWei(value: string) {
  return parseEther(value || '0')
}
