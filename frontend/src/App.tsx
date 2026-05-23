import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect, useMemo, useState } from 'react'
import { isAddress, parseEther } from 'viem'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import {
  CONTRACT_ADDRESSES,
  accuracyTrackerAbi,
  predictionRegistryAbi,
  punditSubscriptionAbi,
} from './protocol'
import './App.css'

type Desk = 'predict' | 'reputation' | 'subscription' | 'admin'
type Phase = 'groups' | 'knockouts'

const imageSections = [
  { src: '/images/hero.png', alt: 'Welcome to Pundit Protocol', label: 'Enter match room', desk: 'predict' },
  { src: '/images/02.png', alt: 'The Gaffer Knows Best', label: 'Read pundit signals', desk: 'reputation' },
  { src: '/images/03.png', alt: 'Built Different squad cards', label: 'Open squad collection', desk: 'subscription' },
  { src: '/images/04.png', alt: 'Match Day is Calling', label: 'Pick a fixture', desk: 'predict' },
  { src: '/images/05.png', alt: 'Make Your Predictions', label: 'Submit prediction', desk: 'predict' },
  { src: '/images/06.png', alt: 'Climb the Standings', label: 'View reputation', desk: 'reputation' },
  { src: '/images/07.png', alt: 'Own Your Reputation', label: 'Check expert badge', desk: 'reputation' },
  { src: '/images/08.png', alt: 'Join the Pundit Nation', label: 'Connect wallet', desk: 'wallet' },
]

const outcomes = ['Home win', 'Draw', 'Away win']
const DEMO_OUTCOME = 1
const DEMO_MARKET_SECONDS = 60

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

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
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

function PremiumPredictions({ pundit }: { pundit: `0x${string}` }) {
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
            Private card from {shortAddress(pundit)}. These are demo picks styled for the live presentation.
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
    </div>
  )
}

function WithdrawEarningsButton() {
  const { data: hash, error, isPending, isSuccess, writeContract } = useWriteContract()
  const explorerUrl = hash ? `https://www.okx.com/web3/explorer/xlayer-test/tx/${hash}` : ''

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
          disabled={isPending}
          onClick={() =>
            writeContract({
              address: CONTRACT_ADDRESSES.subscription,
              abi: punditSubscriptionAbi,
              functionName: 'withdrawEarnings',
            })
          }
        >
          {isPending ? 'Withdrawing...' : 'Withdraw Earnings'}
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
              {hash && (
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
    </div>
  )
}

function PunditProfile({ pundit }: { pundit: `0x${string}` | undefined }) {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()

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
        <p>Premium notes for {shortAddress(pundit)} are locked behind the on-chain pass.</p>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            writeContract({
              address: CONTRACT_ADDRESSES.subscription,
              abi: punditSubscriptionAbi,
              functionName: 'subscribe',
              args: [pundit],
              value: parseEther('0.01'),
            })
          }
        >
          Unlock for 0.01 OKB
        </button>
      </div>
    )
  }

  return <PremiumPredictions pundit={pundit} />
}

function App() {
  const oneHourFromNow = useMemo(() => BigInt(Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), [])
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  const {
    data: predictionHash,
    isPending: isPredicting,
    writeContract: writePrediction,
  } = useWriteContract()
  const {
    data: resolveHash,
    isPending: isResolving,
    writeContract: writeResolveMatch,
  } = useWriteContract()
  const {
    data: gradeHash,
    isPending: isAutoGrading,
    writeContract: writeGradePundit,
  } = useWriteContract()
  const [isViewingCenterMode, setViewingCenterMode] = useState(false)
  const [activePhase, setActivePhase] = useState<Phase>('groups')
  const [activeDesk, setActiveDesk] = useState<Desk>('predict')
  const [selectedMatchId, setSelectedMatchId] = useState('arg-nga-001')
  const [actualOutcome, setActualOutcome] = useState(0)
  const [punditAddress, setPunditAddress] = useState('')
  const [marketCountdown, setMarketCountdown] = useState(DEMO_MARKET_SECONDS)
  const [autoGradedResolveHash, setAutoGradedResolveHash] = useState<`0x${string}` | ''>('')
  const [autoResolvedMatchId, setAutoResolvedMatchId] = useState('')

  const selectedMatch = fixtures.find((fixture) => fixture.id === selectedMatchId) ?? fixtures[0]
  const visibleFixtures = fixtures.filter((fixture) => fixture.phase === activePhase)
  const validPundit = isAddress(punditAddress) ? punditAddress : undefined
  const demoPundit = validPundit ?? address

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
    setMarketCountdown(DEMO_MARKET_SECONDS)
    setAutoResolvedMatchId('')
  }, [selectedMatchId])

  useEffect(() => {
    if (address && !punditAddress) {
      setPunditAddress(address)
    }
  }, [address, punditAddress])

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
      !predictionConfirmed ||
      marketCountdown !== 0 ||
      autoResolvedMatchId === selectedMatch.id ||
      isResolving
    ) {
      return
    }

    setAutoResolvedMatchId(selectedMatch.id)
    writeResolveMatch({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'resolveMatch',
      args: [selectedMatch.id, DEMO_OUTCOME],
    })
  }, [
    address,
    autoResolvedMatchId,
    isResolving,
    marketCountdown,
    predictionConfirmed,
    selectedMatch.id,
    writeResolveMatch,
  ])

  useEffect(() => {
    if (!resolveConfirmed || !resolveHash || !demoPundit || autoGradedResolveHash === resolveHash) {
      return
    }

    setAutoGradedResolveHash(resolveHash)
    writeGradePundit({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'gradePundit',
      args: [selectedMatch.id, demoPundit],
    })
  }, [
    autoGradedResolveHash,
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

  function selectMatch(matchId: string) {
    setSelectedMatchId(matchId)
    setActiveDesk('predict')
  }

  function openDesk(desk: Desk | 'wallet') {
    if (desk !== 'wallet') {
      setActiveDesk(desk)
    }

    document.getElementById('protocol-console')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function submitPrediction() {
    writePrediction({
      address: CONTRACT_ADDRESSES.registry,
      abi: predictionRegistryAbi,
      functionName: 'submitPrediction',
      args: [selectedMatch.id, DEMO_OUTCOME, oneHourFromNow],
    })
  }

  function resolveMatch() {
    writeResolveMatch({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'resolveMatch',
      args: [selectedMatch.id, DEMO_OUTCOME],
    })
  }

  function gradePundit() {
    if (!demoPundit) return
    writeGradePundit({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'gradePundit',
      args: [selectedMatch.id, demoPundit],
    })
  }

  function setSubscriptionPrice() {
    writeContract({
      address: CONTRACT_ADDRESSES.subscription,
      abi: punditSubscriptionAbi,
      functionName: 'setSubscriptionPrice',
      args: [parseEther('0.01')],
    })
  }

  return (
    <main className={isViewingCenterMode ? 'site-frame viewing-center' : 'site-frame'}>
      <nav className="site-nav">
        <a href="#protocol-console">Open app</a>
        <button type="button" onClick={() => setViewingCenterMode((current) => !current)}>
          {isViewingCenterMode ? 'Visual Mode' : 'Viewing Center'}
        </button>
        <ConnectButton chainStatus="name" accountStatus="address" showBalance={false} />
      </nav>

      {isViewingCenterMode ? (
        <section className="viewing-center-shell" data-reveal>
          <div>
            <p className="kicker">Low bandwidth mode</p>
            <h1>Pundit Protocol Viewing Center</h1>
            <p>Text-first match board with the same live contract actions, minus heavy imagery.</p>
          </div>
          <button type="button" onClick={() => setActiveDesk('predict')}>
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
                      disabled={!mounted}
                      onClick={() => {
                        if (account) {
                          openDesk('subscription')
                          return
                        }
                        openConnectModal()
                      }}
                    >
                      {account ? 'Open member room' : section.label}
                    </button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <button type="button" onClick={() => openDesk(section.desk as Desk)}>
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
              {marketCountdown === 0 && autoResolvedMatchId === selectedMatch.id && (
                <small>{isResolving ? 'Oracle resolving automatically...' : 'Auto-oracle triggered'}</small>
              )}
              {marketCountdown === 0 && !predictionConfirmed && (
                <small>Lock the demo prediction to auto-resolve.</small>
              )}
              {marketCountdown === 0 && (
                <button type="button" disabled={isResolving || isAutoGrading} onClick={resolveMatch}>
                  {isResolving
                    ? 'Resolving...'
                    : isAutoGrading
                      ? 'Updating reputation...'
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
                  <p>Demo winning pick: <strong>{outcomes[DEMO_OUTCOME]}</strong></p>
                  <div className="outcome-grid">
                    {outcomes.map((outcome, index) => (
                      <button
                        type="button"
                        className={DEMO_OUTCOME === index ? 'is-active' : ''}
                        key={outcome}
                      >
                        {outcome}
                      </button>
                    ))}
                  </div>
                  <button type="button" disabled={!address || isPredicting} onClick={submitPrediction}>
                    {isPredicting ? 'Locking prediction...' : 'Lock Prediction'}
                  </button>
                  {predictionConfirmed && <p className="success-copy">Prediction locked. Oracle will resolve automatically when the market closes.</p>}
                </div>
              )}

              {activeDesk === 'reputation' && (
                <div className="action-panel">
                  <h2>Reputation room</h2>
                  <label>
                    Pundit address
                    <input value={punditAddress} onChange={(event) => setPunditAddress(event.target.value)} />
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
                    <ExpertBadge team={selectedMatch.home} accuracy={accuracy} />
                  </div>
                  <button type="button" disabled={!demoPundit || isAutoGrading} onClick={gradePundit}>
                    Grade Pundit for Selected Match
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
                  <button type="button" disabled={isPending} onClick={setSubscriptionPrice}>
                    Set My Price to 0.01 OKB
                  </button>
                  <WithdrawEarningsButton />
                  <PunditProfile pundit={validPundit} />
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
                  <button type="button" disabled={isResolving || isAutoGrading} onClick={resolveMatch}>
                    Resolve {selectedMatch.id} with Demo Outcome
                  </button>
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
