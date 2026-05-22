import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect, useMemo, useState } from 'react'
import { isAddress, parseEther } from 'viem'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
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

  return <p className="premium-copy">Premium room unlocked for {shortAddress(pundit)}.</p>
}

function App() {
  const oneHourFromNow = useMemo(() => BigInt(Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), [])
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  const [isViewingCenterMode, setViewingCenterMode] = useState(false)
  const [activePhase, setActivePhase] = useState<Phase>('groups')
  const [activeDesk, setActiveDesk] = useState<Desk>('predict')
  const [selectedMatchId, setSelectedMatchId] = useState('arg-nga-001')
  const [predictionOutcome, setPredictionOutcome] = useState(0)
  const [actualOutcome, setActualOutcome] = useState(0)
  const [punditAddress, setPunditAddress] = useState('')

  const selectedMatch = fixtures.find((fixture) => fixture.id === selectedMatchId) ?? fixtures[0]
  const visibleFixtures = fixtures.filter((fixture) => fixture.phase === activePhase)
  const validPundit = isAddress(punditAddress) ? punditAddress : undefined

  const { data: accuracy } = useReadContract({
    address: CONTRACT_ADDRESSES.tracker,
    abi: accuracyTrackerAbi,
    functionName: 'getAccuracy',
    args: validPundit ? [validPundit] : undefined,
    query: { enabled: Boolean(validPundit) },
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
    writeContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: predictionRegistryAbi,
      functionName: 'submitPrediction',
      args: [selectedMatch.id, predictionOutcome, oneHourFromNow],
    })
  }

  function resolveMatch() {
    writeContract({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'resolveMatch',
      args: [selectedMatch.id, actualOutcome],
    })
  }

  function gradePundit() {
    if (!validPundit) return
    writeContract({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'gradePundit',
      args: [selectedMatch.id, validPundit],
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
            className="image-section reveal-section"
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
              <span>Market closes</span>
              <strong>{selectedMatch.marketClose}</strong>
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
                  <button type="button" disabled={!address || isPending} onClick={submitPrediction}>
                    Lock Prediction
                  </button>
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
                    <ExpertBadge team={selectedMatch.home} accuracy={accuracy} />
                  </div>
                  <button type="button" disabled={!validPundit || isPending} onClick={gradePundit}>
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
                  <button type="button" disabled={isPending} onClick={resolveMatch}>
                    Resolve {selectedMatch.id}
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className="contract-grid">
            <div>
              <span>Registry</span>
              <code>{CONTRACT_ADDRESSES.registry}</code>
            </div>
            <div>
              <span>Tracker</span>
              <code>{CONTRACT_ADDRESSES.tracker}</code>
            </div>
            <div>
              <span>Subscription</span>
              <code>{CONTRACT_ADDRESSES.subscription}</code>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
