import { defineChain, isAddress, parseAbi } from 'viem'

export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testrpc.xlayer.tech/terigon', 'https://testrpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKX X Layer Testnet Explorer',
      url: 'https://www.okx.com/web3/explorer/xlayer-test',
    },
  },
  testnet: true,
})

const zeroAddress = '0x0000000000000000000000000000000000000000'

function envAddress(value: string | undefined, fallback: `0x${string}`): `0x${string}` {
  return value && isAddress(value) ? value : fallback
}

export const CONTRACT_ADDRESSES = {
  userRegistry: envAddress(import.meta.env.VITE_USER_REGISTRY_ADDRESS, zeroAddress),
  registry: envAddress(import.meta.env.VITE_PREDICTION_REGISTRY_ADDRESS, '0x6FB454e649376482AF54b1d7B4E2615C6b853fC4'),
  tracker: envAddress(import.meta.env.VITE_ACCURACY_ADDRESS, '0xAaA41edfd73A45D734bF13264cBe7413c611d2f7'),
  subscription: envAddress(import.meta.env.VITE_SUBSCRIPTION_ADDRESS, '0x7b0d4E922916AEa5cDE60f93b07920168DC18Bb9'),
} as const

export const hasUserRegistry = CONTRACT_ADDRESSES.userRegistry !== zeroAddress

export const userRegistryAbi = parseAbi([
  'function register(string _username)',
  'function hasRegistered(address _user) view returns (bool)',
  'function getUsername(address _user) view returns (string)',
  'event UserRegistered(address indexed user, string username)',
])

export const predictionRegistryAbi = parseAbi([
  'function submitPrediction(string _matchId, uint8 _predictedOutcome, uint256 _kickoffTime)',
  'function getPunditPrediction(string _matchId, address _pundit) view returns (uint8)',
  'function getPredictionsForMatch(string _matchId) view returns ((address pundit,string matchId,uint8 predictedOutcome,uint256 timestamp)[])',
  'function hasPredicted(string _matchId, address _pundit) view returns (bool)',
  'event PredictionLogged(address indexed pundit, string matchId, uint8 predictedOutcome, uint256 timestamp)',
])

export const accuracyTrackerAbi = parseAbi([
  'function resolveMatch(string _matchId, uint8 _actualOutcome)',
  'function gradePundit(string _matchId, address _pundit)',
  'function getAccuracy(address _pundit) view returns (uint256)',
  'function matchResolved(string _matchId) view returns (bool)',
  'function matchOutcomes(string _matchId) view returns (uint8)',
  'function stats(address _pundit) view returns (uint256 wins, uint256 losses, uint256 totalResolved)',
  'event MatchResolved(string matchId, uint8 outcome)',
  'event PunditGraded(address indexed pundit, string matchId, bool won)',
])

export const punditSubscriptionAbi = parseAbi([
  'function setSubscriptionPrice(uint256 _priceInWei)',
  'function subscribe(address _pundit) payable',
  'function isSubscribed(address _subscriber, address _pundit) view returns (bool)',
  'function withdrawEarnings()',
  'function punditMonthlyPrice(address _pundit) view returns (uint256)',
  'function balances(address _pundit) view returns (uint256)',
  'event PriceUpdated(address indexed pundit, uint256 newPrice)',
  'event Subscribed(address indexed subscriber, address indexed pundit, uint256 expiry)',
  'event FundsWithdrawn(address indexed pundit, uint256 amount)',
])
