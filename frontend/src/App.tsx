import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAddress, parseEther } from 'viem'
import { useAccount, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import PunditHomeDashboard from './components/PunditHomeDashboard'
import {
  CONTRACT_ADDRESSES,
  accuracyTrackerAbi,
  hasUserRegistry,
  predictionRegistryAbi,
  punditSubscriptionAbi,
  userRegistryAbi,
  xLayerTestnet,
} from './protocol'
import './App.css'

type Desk = 'predict' | 'reputation' | 'leaderboard' | 'subscription' | 'admin'
type Phase = 'groups' | 'knockouts'
type ActivityItem = {
  name: string
  action: string
  detail: string
}

const imageSections = [
  { src: '/images/hero.png', alt: 'Welcome to Pundit Protocol', label: 'Enter match room', desk: 'predict' },
  { src: '/images/02.png', alt: 'The Gaffer Knows Best', label: 'Read pundit signals', desk: 'reputation' },
  { src: '/images/03.png', alt: 'Built Different squad cards', label: 'Open squad collection', desk: 'subscription' },
  { src: '/images/04.png', alt: 'Match Day is Calling', label: 'Pick a fixture', desk: 'predict' },
  { src: '/images/05.png', alt: 'Make Your Predictions', label: 'Submit prediction', desk: 'predict' },
  { src: '/images/06.png', alt: 'Climb the Standings', label: 'Open leaderboard', desk: 'leaderboard' },
  { src: '/images/07.png', alt: 'Own Your Reputation', label: 'Check expert badge', desk: 'leaderboard' },
  { src: '/images/08.png', alt: 'Join the Pundit Nation', label: 'Connect wallet', desk: 'wallet' },
]

const outcomes = ['Home win', 'Draw', 'Away win']
const DEMO_MARKET_SECONDS = 60
const XLAYER_FAUCET_URL = 'https://web3.okx.com/en-us/xlayer/faucet'
const XLAYER_EXPLORER_TX_URL = 'https://www.okx.com/web3/explorer/xlayer-test/tx'
const deskHashes: Record<Desk, string> = {
  predict: '#predict',
  reputation: '#reputation',
  leaderboard: '#leaderboard',
  subscription: '#squad',
  admin: '#oracle',
}

const hashDesks: Record<string, Desk> = {
  '#predict': 'predict',
  '#reputation': 'reputation',
  '#leaderboard': 'leaderboard',
  '#squad': 'subscription',
  '#subscription': 'subscription',
  '#oracle': 'admin',
}

const fixtures = [
  {
    id: 'arg-nga-001',
    phase: 'groups',
    group: 'Group A',
    home: 'Argentina',
    away: 'Nigeria',
    kickoff: 'Today 20:00',
    venue: 'Lagos Viewing Center',
    marketClose: '60m',
  },
  {
    id: 'fra-jpn-001',
    phase: 'groups',
    group: 'Group A',
    home: 'France',
    away: 'Japan',
    kickoff: 'Tomorrow 18:00',
    venue: 'Paris Desk',
    marketClose: '24h',
  },
  {
    id: 'eng-usa-001',
    phase: 'groups',
    group: 'Group B',
    home: 'England',
    away: 'USA',
    kickoff: 'Tomorrow 21:00',
    venue: 'London Signal Room',
    marketClose: '27h',
  },
  {
    id: 'bra-gha-001',
    phase: 'groups',
    group: 'Group B',
    home: 'Brazil',
    away: 'Ghana',
    kickoff: 'Sat 19:00',
    venue: 'Accra Watch Party',
    marketClose: '2d',
  },
  {
    id: 'r16-001',
    phase: 'knockouts',
    group: 'Round of 16',
    home: 'Winner Group A',
    away: 'Runner-up Group B',
    kickoff: 'Pending',
    venue: 'Knockout Board',
    marketClose: 'Locked',
  },
  {
    id: 'final-001',
    phase: 'knockouts',
    group: 'Final',
    home: 'Semi Winner 1',
    away: 'Semi Winner 2',
    kickoff: 'Pending',
    venue: 'Global Final Desk',
    marketClose: 'Locked',
  },
] as const

function generatedPunditName(address: string) {
  return `Pundit ${address.slice(2, 6).toUpperCase()}`
}

function isTransactionHash(hash: unknown): hash is `0x${string}` {
  return typeof hash === 'string' && hash.startsWith('0x') && hash.length > 10
}

function cachedUsername(address: string | undefined) {
  if (!address) return ''
  return window.localStorage.getItem(`pundit-username-${address.toLowerCase()}`) || ''
}

function cacheUsername(address: string | undefined, username: string) {
  if (!address || !username) return
  window.localStorage.setItem(`pundit-username-${address.toLowerCase()}`, username)
}

function UsernameLabel({ address, fallback = 'Connect wallet' }: { address?: `0x${string}`; fallback?: string }) {
  const { data: username } = useReadContract({
    address: CONTRACT_ADDRESSES.userRegistry,
    abi: userRegistryAbi,
    functionName: 'getUsername',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && hasUserRegistry) },
  })

  if (!address) return <>{fallback}</>
  return <>{username || cachedUsername(address) || generatedPunditName(address)}</>
}

function WalletIdentityButton({ displayName }: { displayName: string }) {
  return (
    <ConnectButton.Custom>
      {({ account, mounted, openAccountModal, openConnectModal }) => (
        <button
          type="button"
          className={account ? 'wallet-identity is-connected' : 'wallet-identity'}
          disabled={!mounted || (!account && !openConnectModal)}
          onClick={() => {
            if (account && openAccountModal) {
              openAccountModal()
              return
            }

            if (!account && openConnectModal) {
              openConnectModal()
            }
          }}
        >
          <span>{account ? displayName : 'Connect Wallet'}</span>
        </button>
      )}
    </ConnectButton.Custom>
  )
}

function ActivityTicker({ items }: { items: ActivityItem[] }) {
  const tickerItems = [...items, ...items]

  return (
    <div className="activity-ticker" aria-label="Live protocol activity">
      <div className="activity-track">
        {tickerItems.map((item, index) => (
          <span className="activity-pill" key={`${item.name}-${item.action}-${index}`}>
            <b>{item.name}</b>
            <em>{item.action}</em>
            <small>{item.detail}</small>
          </span>
        ))}
      </div>
    </div>
  )
}

function transactionUrl(hash: `0x${string}`) {
  return `${XLAYER_EXPLORER_TX_URL}/${hash}`
}

function TransactionToast({ hash, label }: { hash?: unknown; label: string }) {
  if (!isTransactionHash(hash)) return null

  return (
    <a className="tx-toast" href={transactionUrl(hash)} target="_blank" rel="noreferrer">
      <span>{label}</span>
      <strong>{hash.slice(0, 10)}...{hash.slice(-6)}</strong>
      <small>Tap to view on OKX Explorer</small>
    </a>
  )
}

function ExpertBadge({ team, accuracy }: { team: string; accuracy?: bigint }) {
  const percentage = accuracy ? Number(accuracy) / 100 : 0
  if (percentage < 75) return <span className="badge badge-muted">Badge locked</span>

  return <span className="badge">{team} Expert</span>
}

const premiumPredictions = [
  {
    match: 'Argentina vs. Nigeria',
    pick: 'Draw (1-1)',
    confidence: '85%',
    angle: 'Argentina control possession, but Nigeria punish the high line late.',
  },
  {
    match: 'France vs. Japan',
    pick: 'France win',
    confidence: '78%',
    angle: 'France edge the transition battle if Japan chase the second half.',
  },
  {
    match: 'Brazil vs. Ghana',
    pick: 'Over 2.5 goals',
    confidence: '81%',
    angle: 'Both wide channels project as high-volume chance creation zones.',
  },
]

function PremiumPredictions({
  pundit,
  onViewReputation,
}: {
  pundit: `0x${string}`
  onViewReputation: (pundit: `0x${string}`) => void
}) {
  return (
    <div className="mt-5 rounded-[28px] border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/25 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">
            Premium Predictions
          </p>
          <h3 className="mt-2 text-2xl font-black leading-none text-[#fbffe8] sm:text-3xl">
            Alpha room unlocked
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Private card from <UsernameLabel address={pundit} />. These are demo picks styled for the live presentation.
          </p>
        </div>
        <span className="w-fit rounded-full bg-lime-300 px-3 py-1 text-xs font-black uppercase text-black">
          Subscriber
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {premiumPredictions.map((prediction) => (
          <article
            className="rounded-2xl border border-white/12 bg-black/25 p-4 shadow-inner shadow-white/5"
            key={prediction.match}
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Match</p>
            <h4 className="mt-2 text-lg font-black text-[#fbffe8]">{prediction.match}</h4>
            <div className="mt-4 rounded-xl bg-lime-300/12 p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">
                Pundit Pick
              </p>
              <strong className="mt-1 block text-xl text-lime-100">{prediction.pick}</strong>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-white/55">Confidence</span>
              <strong className="rounded-full bg-white/10 px-3 py-1 text-sm text-[#fbffe8]">
                {prediction.confidence}
              </strong>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/62">{prediction.angle}</p>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="mt-5 min-h-12 rounded-full border border-lime-200/30 bg-lime-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-black shadow-xl shadow-lime-950/25 transition hover:-translate-y-0.5 hover:bg-[#fbffe8]"
        onClick={() => onViewReputation(pundit)}
      >
        Check this pundit's reputation
      </button>
    </div>
  )
}

function WithdrawEarningsButton() {
  const { data: hash, error, isPending, isSuccess, writeContract } = useWriteContract()
  const { chainId } = useAccount()
  const { isPending: isSwitchingChain, switchChain } = useSwitchChain()
  const explorerUrl = isTransactionHash(hash) ? transactionUrl(hash) : ''
  const needsXLayer = chainId !== xLayerTestnet.id

  return (
    <div className="mt-5 rounded-[24px] border border-emerald-200/20 bg-emerald-300/[0.08] p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
            Creator Cash-Out
          </p>
          <p className="mt-2 text-sm text-white/62">
            Withdraw earned OKB from your PunditSubscription balance.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending || isSwitchingChain}
          onClick={() => {
            if (needsXLayer) {
              switchChain({ chainId: xLayerTestnet.id })
              return
            }

            writeContract({
              chainId: xLayerTestnet.id,
              address: CONTRACT_ADDRESSES.subscription,
              abi: punditSubscriptionAbi,
              functionName: 'withdrawEarnings',
            })
          }}
        >
          {isSwitchingChain ? 'Switching...' : needsXLayer ? 'Switch to X Layer' : isPending ? 'Withdrawing...' : 'Withdraw Earnings'}
        </button>
      </div>
      {isSuccess && (
        <div className="mt-4 rounded-2xl border border-emerald-200/25 bg-emerald-300/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-100">Withdrawal successful</p>
              <p className="mt-1 text-xs font-bold text-emerald-100/70">
                Your OKB cash-out transaction was sent to X Layer.
              </p>
              {isTransactionHash(hash) && (
                <code className="mt-3 inline-block rounded-full bg-black/25 px-3 py-1 text-xs text-emerald-100">
                  {hash.slice(0, 10)}...{hash.slice(-6)}
                </code>
              )}
            </div>
            {explorerUrl && (
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-100/30 bg-emerald-100 px-4 text-sm font-black text-black"
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                View receipt
              </a>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-bold text-red-200">{error.message}</p>}
      <TransactionToast hash={hash} label="Withdrawal transaction sent" />
    </div>
  )
}

function PunditProfile({
  pundit,
  onViewReputation,
}: {
  pundit: `0x${string}` | undefined
  onViewReputation: (pundit: `0x${string}`) => void
}) {
  const { address, chainId } = useAccount()
  const { isPending: isSwitchingChain, switchChain } = useSwitchChain()
  const { data: subscribeHash, error, writeContract, isPending } = useWriteContract()
  const needsXLayer = chainId !== xLayerTestnet.id

  const { data: subscribed } = useReadContract({
    address: CONTRACT_ADDRESSES.subscription,
    abi: punditSubscriptionAbi,
    functionName: 'isSubscribed',
    args: address && pundit ? [address, pundit] : undefined,
    query: { enabled: Boolean(address && pundit) },
  })

  if (!pundit) return <p className="muted-copy">Paste a pundit address to preview the subscription gate.</p>

  if (!subscribed) {
    return (
      <div className="paywall">
        <p>Premium notes for <UsernameLabel address={pundit} /> are locked behind the on-chain pass.</p>
        <button
          type="button"
          disabled={isPending || isSwitchingChain}
          onClick={() => {
            if (needsXLayer) {
              switchChain({ chainId: xLayerTestnet.id })
              return
            }

            writeContract({
              chainId: xLayerTestnet.id,
              address: CONTRACT_ADDRESSES.subscription,
              abi: punditSubscriptionAbi,
              functionName: 'subscribe',
              args: [pundit],
              value: parseEther('0.01'),
            })
          }}
        >
          {isSwitchingChain ? 'Switching...' : needsXLayer ? 'Switch to X Layer' : 'Unlock for 0.01 OKB'}
        </button>
        <TransactionToast hash={subscribeHash} label="Subscription transaction sent" />
        {error && <p className="error-copy">{error.message}</p>}
      </div>
    )
  }

  return <PremiumPredictions pundit={pundit} onViewReputation={onViewReputation} />
}

function PunditDocs() {
  return (
    <main className="docs-page">
      <aside className="docs-sidebar">
        <a className="docs-brand" href="/">
          <span>Pundit Protocol</span>
          <small>Docs v1.0</small>
        </a>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#quickstart">Quickstart</a>
          <a href="#contracts">Contracts</a>
          <a href="#prediction">Prediction API</a>
          <a href="#reputation">Reputation</a>
          <a href="#subscriptions">Subscriptions</a>
          <a href="#demo">Demo Flow</a>
        </nav>
      </aside>

      <section className="docs-main">
        <header id="overview" className="docs-hero">
          <p className="kicker">Developer documentation</p>
          <h1>Pundit Protocol API Docs</h1>
          <p>
            Integrate World Cup prediction markets, paid pundit rooms, oracle resolution,
            and reputation reads on X Layer Testnet.
          </p>
          <div className="docs-actions">
            <a href="/#predict">Open app</a>
            <a href={XLAYER_FAUCET_URL} target="_blank" rel="noreferrer">Get test OKB</a>
          </div>
        </header>

        <section id="quickstart" className="docs-block">
          <div>
            <p className="docs-eyebrow">Quickstart</p>
            <h2>Install the frontend kit</h2>
            <p>Use Wagmi, Viem, RainbowKit, and React Query for wallet-aware contract calls.</p>
          </div>
          <pre><code>{`npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query`}</code></pre>
        </section>

        <section className="docs-block">
          <div>
            <p className="docs-eyebrow">Network</p>
            <h2>Connect to X Layer Testnet</h2>
            <p>Point your app at chain ID 1952 and use OKB as the native gas token.</p>
          </div>
          <pre><code>{`export const xLayerTestnet = {
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
}`}</code></pre>
        </section>

        <section id="contracts" className="docs-block">
          <div>
            <p className="docs-eyebrow">Contract reference</p>
            <h2>Deployed addresses</h2>
            <p>Use these X Layer Testnet contracts when wiring reads and writes.</p>
          </div>
          <div className="docs-address-grid">
            <div><span>UserRegistry</span><code>{CONTRACT_ADDRESSES.userRegistry}</code></div>
            <div><span>PredictionRegistry</span><code>{CONTRACT_ADDRESSES.registry}</code></div>
            <div><span>AccuracyTracker</span><code>{CONTRACT_ADDRESSES.tracker}</code></div>
            <div><span>PunditSubscription</span><code>{CONTRACT_ADDRESSES.subscription}</code></div>
          </div>
        </section>

        <section id="prediction" className="docs-block">
          <div>
            <p className="docs-eyebrow">Write</p>
            <h2>Submit prediction</h2>
            <p>Outcome values are 0 for home win, 1 for draw, and 2 for away win.</p>
          </div>
          <pre><code>{`writeContract({
  address: CONTRACT_ADDRESSES.registry,
  abi: predictionRegistryAbi,
  functionName: 'submitPrediction',
  args: [matchId, selectedOutcome, deadline],
})`}</code></pre>
        </section>

        <section id="reputation" className="docs-block">
          <div>
            <p className="docs-eyebrow">Oracle and reputation</p>
            <h2>Resolve, grade, and read accuracy</h2>
            <p>Resolve a match result, grade a pundit, then refetch the accuracy score.</p>
          </div>
          <pre><code>{`writeContract({
  address: CONTRACT_ADDRESSES.tracker,
  abi: accuracyTrackerAbi,
  functionName: 'resolveMatch',
  args: [matchId, actualOutcome],
})

const { data: accuracy } = useReadContract({
  address: CONTRACT_ADDRESSES.tracker,
  abi: accuracyTrackerAbi,
  functionName: 'getAccuracy',
  args: [pundit],
})`}</code></pre>
        </section>

        <section id="subscriptions" className="docs-block">
          <div>
            <p className="docs-eyebrow">Paywall</p>
            <h2>Subscribe to a pundit</h2>
            <p>Fans pay 0.01 OKB, then the frontend checks isSubscribed before revealing premium predictions.</p>
          </div>
          <pre><code>{`writeContract({
  address: CONTRACT_ADDRESSES.subscription,
  abi: punditSubscriptionAbi,
  functionName: 'subscribe',
  args: [pundit],
  value: parseEther('0.01'),
})`}</code></pre>
        </section>

        <section id="demo" className="docs-block docs-flow">
          <div>
            <p className="docs-eyebrow">Demo flow</p>
            <h2>World Cup prediction loop</h2>
            <p>For the hackathon demo: connect wallet, fund with faucet OKB, submit a pick, wait for market close, resolve oracle, and watch reputation update.</p>
          </div>
          <ol>
            <li>Connect wallet on X Layer Testnet.</li>
            <li>Choose Home win, Draw, or Away win.</li>
            <li>Submit prediction with Wagmi.</li>
            <li>Resolve the match from the oracle desk.</li>
            <li>Grade the pundit and refresh leaderboard/reputation.</li>
          </ol>
        </section>
      </section>
    </main>
  )
}

function UsernameModal({
  address,
  onDismiss,
  onRegistered,
}: {
  address: `0x${string}`
  onDismiss: () => void
  onRegistered: (username: string) => void
}) {
  const [username, setUsername] = useState('')
  const { chainId } = useAccount()
  const { isPending: isSwitchingChain, switchChain } = useSwitchChain()
  const {
    data: registrationHash,
    error,
    isPending,
    writeContract: writeRegistration,
  } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({
    hash: registrationHash,
  })
  const isValidUsername = /^[A-Za-z0-9_]{3,24}$/.test(username)
  const needsXLayer = chainId !== xLayerTestnet.id

  useEffect(() => {
    if (isSuccess) onRegistered(username)
  }, [isSuccess, onRegistered, username])

  function saveLocalUsername() {
    cacheUsername(address, username)
    onRegistered(username)
  }

  return (
    <aside className="username-modal-backdrop" aria-labelledby="username-title">
      <section className="username-modal">
        <button type="button" className="identity-dismiss" aria-label="Dismiss username prompt" onClick={onDismiss}>
          Later
        </button>
        <p className="kicker">Create your pundit identity</p>
        <h2 id="username-title">Choose a username</h2>
        <p>
          This name is saved on-chain and shown across predictions, subscriptions,
          reputation, and the leaderboard instead of your wallet address.
        </p>
        <label>
          Username
          <input
            autoFocus
            maxLength={24}
            placeholder="e.g. LagosOracle"
            value={username}
            onChange={(event) => setUsername(event.target.value.trim())}
          />
        </label>
        <small>Use 3-24 letters, numbers, or underscores.</small>
        <button
          type="button"
          disabled={!isValidUsername || isPending || isSwitchingChain}
          onClick={() => {
            if (!hasUserRegistry) {
              saveLocalUsername()
              return
            }

            if (needsXLayer) {
              switchChain({ chainId: xLayerTestnet.id })
              return
            }

            cacheUsername(address, username)
            writeRegistration({
              chainId: xLayerTestnet.id,
              address: CONTRACT_ADDRESSES.userRegistry,
              abi: userRegistryAbi,
              functionName: 'register',
              args: [username],
            })
          }}
        >
          {isSwitchingChain
            ? 'Switching...'
            : hasUserRegistry && needsXLayer
              ? 'Switch to X Layer'
              : isPending
                ? 'Registering...'
                : hasUserRegistry
                  ? 'Register username'
                  : 'Save demo username'}
        </button>
        <TransactionToast hash={registrationHash} label="Username transaction sent" />
        {error && <p className="error-copy">{error.message}</p>}
      </section>
    </aside>
  )
}

function App() {
  const [isDocsPage] = useState(() => window.location.pathname.replace(/\/+$/, '') === '/docs')
  const { address, chainId } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { isPending: isSwitchingChain, switchChain } = useSwitchChain()
  const {
    data: settingsHash,
    error: settingsError,
    writeContract,
    isPending,
  } = useWriteContract()
  const {
    data: predictionHash,
    error: predictionError,
    isPending: isPredicting,
    writeContract: writePrediction,
  } = useWriteContract()
  const {
    data: resolveHash,
    error: resolveError,
    isPending: isResolving,
    writeContract: writeResolveMatch,
  } = useWriteContract()
  const {
    data: gradeHash,
    error: gradeError,
    isPending: isAutoGrading,
    writeContract: writeGradePundit,
  } = useWriteContract()
  const [isViewingCenterMode, setViewingCenterMode] = useState(false)
  const [activePhase, setActivePhase] = useState<Phase>('groups')
  const [activeDesk, setActiveDesk] = useState<Desk>('predict')
  const [selectedMatchId, setSelectedMatchId] = useState('arg-nga-001')
  const [predictionOutcome, setPredictionOutcome] = useState(1)
  const [actualOutcome, setActualOutcome] = useState(0)
  const [punditAddress, setPunditAddress] = useState('')
  const [localUsername, setLocalUsername] = useState('')
  const [isUsernamePromptDismissed, setUsernamePromptDismissed] = useState(false)
  const [hasEnteredApp, setHasEnteredApp] = useState(() => Boolean(window.location.hash))
  const [marketCountdown, setMarketCountdown] = useState(DEMO_MARKET_SECONDS)
  const [autoResolvedMatchId, setAutoResolvedMatchId] = useState('')
  const [activePredictionMatchId, setActivePredictionMatchId] = useState('')
  const autoResolvedMatchRef = useRef('')
  const autoGradedResolveHashRef = useRef<`0x${string}` | ''>('')

  const selectedMatch = fixtures.find((fixture) => fixture.id === selectedMatchId) ?? fixtures[0]
  const visibleFixtures = fixtures.filter((fixture) => fixture.phase === activePhase)
  const validPundit = isAddress(punditAddress) ? punditAddress : undefined
  const demoPundit = validPundit ?? address
  const needsXLayer = Boolean(address && chainId !== xLayerTestnet.id)
  const aiOutcome = selectedMatch.phase === 'knockouts' ? 0 : (selectedMatch.id.length + selectedMatch.home.length) % outcomes.length

  const {
    data: hasRegistered,
    refetch: refetchRegistration,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.userRegistry,
    abi: userRegistryAbi,
    functionName: 'hasRegistered',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && hasUserRegistry) },
  })

  const {
    data: registeredUsername,
    refetch: refetchUsername,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.userRegistry,
    abi: userRegistryAbi,
    functionName: 'getUsername',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && hasRegistered && hasUserRegistry) },
  })

  const userDisplayName = registeredUsername || localUsername || (address ? generatedPunditName(address) : 'Connected Pundit')
  const activityItems = useMemo<ActivityItem[]>(() => [
    {
      name: address ? userDisplayName : 'New visitor',
      action: address ? 'signed in' : 'watching',
      detail: address ? 'identity ready' : 'connect wallet',
    },
    {
      name: 'LagosOracle',
      action: 'subscribed',
      detail: 'Argentina room',
    },
    {
      name: 'Pundit AI Coach',
      action: 'posted pick',
      detail: outcomes[aiOutcome],
    },
    {
      name: 'AccraSignal',
      action: 'climbed',
      detail: 'leaderboard #3',
    },
    {
      name: 'XLayerFan',
      action: 'registered',
      detail: 'new pundit',
    },
  ], [address, aiOutcome, userDisplayName])

  const { data: accuracy, refetch: refetchAccuracy } = useReadContract({
    address: CONTRACT_ADDRESSES.tracker,
    abi: accuracyTrackerAbi,
    functionName: 'getAccuracy',
    args: demoPundit ? [demoPundit] : undefined,
    query: { enabled: Boolean(demoPundit) },
  })

  const { data: stats, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESSES.tracker,
    abi: accuracyTrackerAbi,
    functionName: 'stats',
    args: demoPundit ? [demoPundit] : undefined,
    query: { enabled: Boolean(demoPundit) },
  })

  const { isSuccess: resolveConfirmed } = useWaitForTransactionReceipt({
    hash: resolveHash,
  })

  const { isSuccess: gradeConfirmed } = useWaitForTransactionReceipt({
    hash: gradeHash,
  })

  const { isSuccess: predictionConfirmed } = useWaitForTransactionReceipt({
    hash: predictionHash,
  })

  const leaderboardEntries = useMemo(() => {
    const userAccuracy = accuracy ? Number(accuracy) / 100 : 0
    const userWins = stats ? Number(stats[0]) : 0

    return [
      {
        name: 'Pundit AI Coach',
        type: 'Computer competitor',
        accuracy: 86,
        wins: 14,
        streak: 5,
        pick: outcomes[aiOutcome],
      },
      {
        name: userDisplayName,
        type: 'Wallet competitor',
        accuracy: userAccuracy,
        wins: userWins,
        streak: gradeConfirmed ? 1 : 0,
        pick: outcomes[predictionOutcome],
      },
      {
        name: 'Lagos Signal Desk',
        type: 'Demo competitor',
        accuracy: 78,
        wins: 9,
        streak: 3,
        pick: 'Home win',
      },
    ].sort((left, right) => right.accuracy - left.accuracy)
  }, [accuracy, aiOutcome, gradeConfirmed, predictionOutcome, stats, userDisplayName])

  const scrollToConsole = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const consoleSection = document.getElementById('protocol-console')
    consoleSection?.classList.add('is-visible')
    consoleSection?.scrollIntoView({
      behavior,
      block: 'start',
    })
  }, [])

  useEffect(() => {
    const animatedSections = document.querySelectorAll<HTMLElement>('[data-reveal]')

    if (!('IntersectionObserver' in window)) {
      animatedSections.forEach((section) => section.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting))
      },
      { rootMargin: '0px 0px -16% 0px', threshold: 0.24 },
    )

    animatedSections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isViewingCenterMode])

  useEffect(() => {
    function applyHashRoute() {
      const nextDesk = hashDesks[window.location.hash]
      if (!nextDesk) return

      setHasEnteredApp(true)
      setActiveDesk(nextDesk)
      window.setTimeout(() => scrollToConsole('auto'), 0)
      window.setTimeout(() => scrollToConsole('auto'), 250)
    }

    applyHashRoute()
    window.addEventListener('hashchange', applyHashRoute)
    return () => window.removeEventListener('hashchange', applyHashRoute)
  }, [scrollToConsole])

  useEffect(() => {
    if (!address) {
      window.setTimeout(() => setLocalUsername(''), 0)
      return
    }

    window.setTimeout(() => setLocalUsername(cachedUsername(address)), 0)
    if (hasRegistered) void refetchUsername()
  }, [address, hasRegistered, refetchUsername])

  useEffect(() => {
    if (marketCountdown <= 0) return

    const countdownId = window.setTimeout(() => {
      setMarketCountdown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(countdownId)
  }, [marketCountdown])

  useEffect(() => {
    if (
      !address ||
      needsXLayer ||
      !predictionConfirmed ||
      marketCountdown !== 0 ||
      !activePredictionMatchId ||
      autoResolvedMatchRef.current === activePredictionMatchId ||
      isResolving
    ) {
      return
    }

    autoResolvedMatchRef.current = activePredictionMatchId
    window.setTimeout(() => setAutoResolvedMatchId(activePredictionMatchId), 0)
    writeResolveMatch({
      chainId: xLayerTestnet.id,
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'resolveMatch',
      args: [activePredictionMatchId, predictionOutcome],
    })
  }, [
    address,
    activePredictionMatchId,
    isResolving,
    marketCountdown,
    needsXLayer,
    predictionConfirmed,
    predictionOutcome,
    writeResolveMatch,
  ])

  useEffect(() => {
    if (!resolveConfirmed || !resolveHash || !demoPundit || autoGradedResolveHashRef.current === resolveHash) {
      return
    }

    autoGradedResolveHashRef.current = resolveHash
    writeGradePundit({
      chainId: xLayerTestnet.id,
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'gradePundit',
      args: [activePredictionMatchId || selectedMatch.id, demoPundit],
    })
  }, [
    activePredictionMatchId,
    demoPundit,
    resolveConfirmed,
    resolveHash,
    selectedMatch.id,
    writeGradePundit,
  ])

  useEffect(() => {
    if (resolveConfirmed || gradeConfirmed) {
      void refetchAccuracy()
      void refetchStats()
    }
  }, [gradeConfirmed, refetchAccuracy, refetchStats, resolveConfirmed])

  useEffect(() => {
    if (!demoPundit) return

    const refreshId = window.setInterval(() => {
      void refetchAccuracy()
      void refetchStats()
    }, 12000)

    return () => window.clearInterval(refreshId)
  }, [demoPundit, refetchAccuracy, refetchStats])

  function selectMatch(matchId: string) {
    setSelectedMatchId(matchId)
    setMarketCountdown(DEMO_MARKET_SECONDS)
    autoResolvedMatchRef.current = ''
    setActivePredictionMatchId('')
    setAutoResolvedMatchId('')
    setActiveDesk('predict')
  }

  function openDesk(desk: Desk | 'wallet') {
    if (desk !== 'wallet') {
      setActiveDesk(desk)
      window.history.replaceState(null, '', deskHashes[desk])
    }

    scrollToConsole()
  }

  function ensureXLayer() {
    if (!address) return false
    if (!needsXLayer) return true

    switchChain({ chainId: xLayerTestnet.id })
    return false
  }

  function submitPrediction() {
    if (!ensureXLayer()) return

    const oneHourFromNow = BigInt(Math.floor((Date.now() + 60 * 60 * 1000) / 1000))
    const demoMatchId = `${selectedMatch.id}-${Date.now()}`
    setActivePredictionMatchId(demoMatchId)
    autoResolvedMatchRef.current = ''
    setAutoResolvedMatchId('')
    writePrediction({
      chainId: xLayerTestnet.id,
      address: CONTRACT_ADDRESSES.registry,
      abi: predictionRegistryAbi,
      functionName: 'submitPrediction',
      args: [demoMatchId, predictionOutcome, oneHourFromNow],
    })
  }

  function resolveMatch(outcome = predictionOutcome) {
    if (!ensureXLayer()) return

    writeResolveMatch({
      chainId: xLayerTestnet.id,
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'resolveMatch',
      args: [activePredictionMatchId || selectedMatch.id, outcome],
    })
  }

  function gradePundit() {
    if (!demoPundit) return
    if (!ensureXLayer()) return

    writeGradePundit({
      chainId: xLayerTestnet.id,
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'gradePundit',
      args: [activePredictionMatchId || selectedMatch.id, demoPundit],
    })
  }

  function setSubscriptionPrice() {
    if (!ensureXLayer()) return

    writeContract({
      chainId: xLayerTestnet.id,
      address: CONTRACT_ADDRESSES.subscription,
      abi: punditSubscriptionAbi,
      functionName: 'setSubscriptionPrice',
      args: [parseEther('0.01')],
    })
  }

  const shouldShowUsernameModal = Boolean(
    address &&
      !registeredUsername &&
      !localUsername &&
      !isUsernamePromptDismissed &&
      (hasRegistered === false || !hasUserRegistry),
  )
  const usernameModal = shouldShowUsernameModal && address ? (
    <UsernameModal
      address={address}
      onDismiss={() => setUsernamePromptDismissed(true)}
      onRegistered={(username) => {
        setLocalUsername(username)
        setUsernamePromptDismissed(true)
        void refetchRegistration()
        void refetchUsername()
      }}
    />
  ) : null

  if (isDocsPage) {
    return <PunditDocs />
  }

  if (!hasEnteredApp) {
    return (
      <>
        <PunditHomeDashboard
          walletAddress={address}
          onConnect={() => openConnectModal?.()}
          onEnter={() => {
            setHasEnteredApp(true)
            window.setTimeout(() => scrollToConsole('auto'), 0)
          }}
        />
        <ActivityTicker items={activityItems} />
        {usernameModal}
      </>
    )
  }

  return (
    <main className={isViewingCenterMode ? 'site-frame viewing-center' : 'site-frame'}>
      {usernameModal}
      <nav className="site-nav">
        <a href="#predict" onClick={() => openDesk('predict')}>Open app</a>
        <button type="button" onClick={() => openDesk('leaderboard')} aria-label="Open leaderboard">
          Leaderboard
        </button>
        <a href="/docs">Docs</a>
        <a href={XLAYER_FAUCET_URL} target="_blank" rel="noreferrer">
          X Layer Faucet
        </a>
        <button type="button" onClick={() => setViewingCenterMode((current) => !current)}>
          {isViewingCenterMode ? 'Visual Mode' : 'Viewing Center'}
        </button>
        <WalletIdentityButton displayName={userDisplayName} />
      </nav>
      <ActivityTicker items={activityItems} />
      <div className="tx-toast-stack" aria-live="polite">
        <TransactionToast hash={predictionHash} label="Prediction transaction sent" />
        <TransactionToast hash={resolveHash} label="Oracle transaction sent" />
        <TransactionToast hash={gradeHash} label="Reputation transaction sent" />
        <TransactionToast hash={settingsHash} label="Subscription settings transaction sent" />
      </div>
      {needsXLayer && (
        <div className="network-warning" role="status">
          <div>
            <strong>Switch to X Layer Testnet</strong>
            <span>Transactions use OKB gas on chain 1952.</span>
          </div>
          <button type="button" disabled={isSwitchingChain} onClick={() => switchChain({ chainId: xLayerTestnet.id })}>
            {isSwitchingChain ? 'Switching...' : 'Switch network'}
          </button>
        </div>
      )}

      {isViewingCenterMode ? (
        <section className="viewing-center-shell" data-reveal>
          <div>
            <p className="kicker">Low bandwidth mode</p>
            <h1>Pundit Protocol Viewing Center</h1>
            <p>Text-first match board with the same live contract actions, minus heavy imagery.</p>
          </div>
          <button type="button" onClick={() => openDesk('predict')}>
            Start with {selectedMatch.home} vs {selectedMatch.away}
          </button>
        </section>
      ) : (
        imageSections.map((section, index) => (
          <section
            className={index === 0 ? 'image-section reveal-section is-visible' : 'image-section reveal-section'}
            key={section.src}
            data-reveal
            data-direction={index % 2 === 0 ? 'right' : 'left'}
            onClick={() => {
              if (section.desk !== 'wallet') {
                openDesk(section.desk as Desk)
              }
            }}
          >
            <img
              src={section.src}
              alt={section.alt}
              className="section-image"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            <div className="section-hotspot">
              {section.desk === 'wallet' ? (
                <ConnectButton.Custom>
                  {({ account, mounted, openConnectModal }) => (
                    <button
                      type="button"
                      disabled={!mounted || (!account && !openConnectModal)}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (account) {
                          openDesk('subscription')
                          return
                        }
                        openConnectModal?.()
                      }}
                    >
                      {account ? 'Open member room' : section.label}
                    </button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <button type="button" onClick={(event) => {
                  event.stopPropagation()
                  openDesk(section.desk as Desk)
                }}>
                  {section.label}
                </button>
              )}
            </div>
          </section>
        ))
      )}

      <section id="protocol-console" className="console-section" data-reveal>
        <div className="app-dashboard">
          <header className="dashboard-hero">
            <div>
              <p className="kicker">Live on X Layer Testnet</p>
              <h1>{selectedMatch.home} vs {selectedMatch.away}</h1>
              <p>{selectedMatch.group} / {selectedMatch.kickoff} / {selectedMatch.venue}</p>
            </div>
            <div className="hero-stat">
              <span>{marketCountdown === 0 ? 'Market closed' : 'Market closes'}</span>
              <strong>{marketCountdown}s</strong>
              {marketCountdown === 0 && autoResolvedMatchId === (activePredictionMatchId || selectedMatch.id) && (
                <small>{isResolving ? 'Oracle resolving automatically...' : 'Auto-oracle triggered'}</small>
              )}
              {marketCountdown === 0 && !predictionConfirmed && (
                <small>Lock the demo prediction to auto-resolve.</small>
              )}
              {marketCountdown === 0 && (
                <button type="button" disabled={isResolving || isAutoGrading || isSwitchingChain} onClick={() => resolveMatch()}>
                  {isResolving
                    ? 'Resolving...'
                    : isAutoGrading
                      ? 'Updating reputation...'
                      : isSwitchingChain
                        ? 'Switching...'
                        : needsXLayer
                          ? 'Switch to X Layer'
                          : 'Trigger Oracle / Resolve Match'}
                </button>
              )}
            </div>
          </header>

          <div className="mode-strip" role="tablist" aria-label="Tournament phase">
            {(['groups', 'knockouts'] as Phase[]).map((phase) => (
              <button
                type="button"
                className={activePhase === phase ? 'is-active' : ''}
                key={phase}
                onClick={() => setActivePhase(phase)}
              >
                {phase === 'groups' ? 'Groups' : 'Knockouts'}
              </button>
            ))}
          </div>

          <div className="fixture-layout">
            <aside className="fixture-rail">
              {visibleFixtures.map((fixture) => (
                <button
                  type="button"
                  className={fixture.id === selectedMatch.id ? 'fixture-card is-selected' : 'fixture-card'}
                  key={fixture.id}
                  onClick={() => selectMatch(fixture.id)}
                >
                  <span>{fixture.group}</span>
                  <strong>{fixture.home} vs {fixture.away}</strong>
                  <small>{fixture.kickoff}</small>
                </button>
              ))}
            </aside>

            <section className="match-room">
              <div className="desk-tabs" role="tablist" aria-label="Protocol action">
                {[
                  ['predict', 'Predict'],
                  ['reputation', 'Reputation'],
                  ['leaderboard', 'Leaderboard'],
                  ['subscription', 'Subscribe'],
                  ['admin', 'Oracle'],
                ].map(([desk, label]) => (
                  <button
                    type="button"
                    className={activeDesk === desk ? 'is-active' : ''}
                    key={desk}
                    onClick={() => setActiveDesk(desk as Desk)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeDesk === 'predict' && (
                <div className="action-panel">
                  <h2>Submit your call</h2>
                  <p>Selected match ID: <code>{selectedMatch.id}</code></p>
                  <p>Selected pick: <strong>{outcomes[predictionOutcome]}</strong></p>
                  <div className="outcome-grid">
                    {outcomes.map((outcome, index) => (
                      <button
                        type="button"
                        className={predictionOutcome === index ? 'is-active' : ''}
                        key={outcome}
                        onClick={() => setPredictionOutcome(index)}
                      >
                        {outcome}
                      </button>
                    ))}
                  </div>
                  <button type="button" disabled={!address || isPredicting || isSwitchingChain} onClick={submitPrediction}>
                    {isSwitchingChain ? 'Switching...' : needsXLayer ? 'Switch to X Layer' : isPredicting ? 'Locking prediction...' : 'Lock Prediction'}
                  </button>
                  <a className="faucet-link" href={XLAYER_FAUCET_URL} target="_blank" rel="noreferrer">
                    Need test OKB for gas? Open X Layer faucet
                  </a>
                  {predictionConfirmed && <p className="success-copy">Prediction locked. Oracle will resolve automatically when the market closes.</p>}
                  {predictionError && <p className="error-copy">{predictionError.message}</p>}
                </div>
              )}

              {activeDesk === 'reputation' && (
                <div className="action-panel">
                  <h2>Reputation room</h2>
                  <div className="connected-reputation">
                    <div>
                      <span>Tracking</span>
                      <strong><UsernameLabel address={demoPundit} /></strong>
                    </div>
                    <div>
                      <span>Auto refresh</span>
                      <strong>{demoPundit ? 'Every 12s' : 'Paused'}</strong>
                    </div>
                    {address && (
                      <button type="button" onClick={() => setPunditAddress(address)}>
                        Use my wallet
                      </button>
                    )}
                  </div>
                  <label>
                    Pundit address
                    <input
                      value={punditAddress}
                      placeholder={address ? address : 'Paste a pundit wallet address'}
                      onChange={(event) => setPunditAddress(event.target.value)}
                    />
                  </label>
                  <div className="reputation-card">
                    <span>Accuracy</span>
                    <strong>{accuracy ? `${Number(accuracy) / 100}%` : '0%'}</strong>
                    <p>
                      Wins: {stats ? Number(stats[0]) : 0} / Losses: {stats ? Number(stats[1]) : 0} /
                      Resolved: {stats ? Number(stats[2]) : 0}
                    </p>
                    {resolveConfirmed && <p>Oracle resolved with demo outcome.</p>}
                    {isAutoGrading && <p>Submitting grading transaction...</p>}
                    {gradeConfirmed && <p>Reputation refreshed. Winning prediction recorded.</p>}
                    {gradeError && <p className="error-copy">{gradeError.message}</p>}
                    <ExpertBadge team={selectedMatch.home} accuracy={accuracy} />
                  </div>
                  <button type="button" disabled={!demoPundit || isAutoGrading || isSwitchingChain} onClick={gradePundit}>
                    {isSwitchingChain ? 'Switching...' : needsXLayer ? 'Switch to X Layer' : 'Grade Pundit for Selected Match'}
                  </button>
                </div>
              )}

              {activeDesk === 'leaderboard' && (
                <div className="action-panel">
                  <h2>Leaderboard</h2>
                  <p>
                    Rank live pundits against a computer competitor so the demo always has a rival
                    even before many wallets join.
                  </p>
                  <div className="connected-reputation">
                    <div>
                      <span>Live reads</span>
                      <strong><UsernameLabel address={demoPundit} /></strong>
                    </div>
                    <div>
                      <span>Refresh cycle</span>
                      <strong>12s</strong>
                    </div>
                    <button type="button" onClick={() => {
                      void refetchAccuracy()
                      void refetchStats()
                    }}>
                      Refresh now
                    </button>
                  </div>
                  <div className="leaderboard-list">
                    {leaderboardEntries.map((entry, index) => (
                      <article className={entry.type === 'Computer competitor' ? 'leaderboard-row is-ai' : 'leaderboard-row'} key={entry.name}>
                        <strong>#{index + 1}</strong>
                        <div>
                          <h3>{entry.name}</h3>
                          <span>{entry.type}</span>
                        </div>
                        <div>
                          <small>Accuracy</small>
                          <b>{entry.accuracy}%</b>
                        </div>
                        <div>
                          <small>Wins</small>
                          <b>{entry.wins}</b>
                        </div>
                        <div>
                          <small>Pick</small>
                          <b>{entry.pick}</b>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button type="button" onClick={() => setPredictionOutcome(aiOutcome)}>
                    Use Pundit AI pick for this match
                  </button>
                </div>
              )}

              {activeDesk === 'subscription' && (
                <div className="action-panel">
                  <h2>Squad collection pass</h2>
                  <p>
                    Treat the squad cards as access passes: set your pundit price, then let fans unlock
                    your premium room with an on-chain subscription.
                  </p>
                  <label>
                    Pundit address
                    <input value={punditAddress} onChange={(event) => setPunditAddress(event.target.value)} />
                  </label>
                  <button type="button" disabled={isPending || isSwitchingChain} onClick={setSubscriptionPrice}>
                    {isSwitchingChain ? 'Switching...' : needsXLayer ? 'Switch to X Layer' : 'Set My Price to 0.01 OKB'}
                  </button>
                  <TransactionToast hash={settingsHash} label="Subscription settings transaction sent" />
                  {settingsError && <p className="error-copy">{settingsError.message}</p>}
                  <WithdrawEarningsButton />
                  <PunditProfile
                    pundit={validPundit}
                    onViewReputation={(targetPundit) => {
                      setPunditAddress(targetPundit)
                      openDesk('reputation')
                    }}
                  />
                </div>
              )}

              {activeDesk === 'admin' && (
                <div className="action-panel">
                  <h2>Oracle desk</h2>
                  <p>Resolve the selected match, then grade pundits from the reputation room.</p>
                  <label>
                    Actual result
                    <select value={actualOutcome} onChange={(event) => setActualOutcome(Number(event.target.value))}>
                      {outcomes.map((outcome, index) => (
                        <option key={outcome} value={index}>
                          {outcome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" disabled={isResolving || isAutoGrading || isSwitchingChain} onClick={() => resolveMatch(actualOutcome)}>
                    {isSwitchingChain ? 'Switching...' : needsXLayer ? 'Switch to X Layer' : `Resolve ${selectedMatch.id} with Actual Result`}
                  </button>
                  {resolveError && <p className="error-copy">{resolveError.message}</p>}
                </div>
              )}
            </section>
          </div>

          <footer className="app-footer">
            <strong>punditprotocol v1.0.0.</strong>
            <span>buildX hackthon(x cup edition)</span>
            <small>©2026 all copyrights reserved by pundit protocol</small>
          </footer>
        </div>
      </section>
    </main>
  )
}

export default App
