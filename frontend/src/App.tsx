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

const imageSections = [
  { src: '/images/hero.png', alt: 'Welcome to Pundit Protocol' },
  { src: '/images/02.png', alt: 'The Gaffer Knows Best' },
  { src: '/images/03.png', alt: 'Built Different squad cards' },
  { src: '/images/04.png', alt: 'Match Day is Calling' },
  { src: '/images/05.png', alt: 'Make Your Predictions' },
  { src: '/images/06.png', alt: 'Climb the Standings' },
  { src: '/images/07.png', alt: 'Own Your Reputation' },
  { src: '/images/08.png', alt: 'Join the Pundit Nation' },
]

const outcomes = ['Home win', 'Draw', 'Away win']

const fixtures = {
  groups: {
    GroupA: [
      { id: 'arg-nga-001', home: 'Argentina', away: 'Nigeria' },
      { id: 'fra-jpn-001', home: 'France', away: 'Japan' },
    ],
    GroupB: [
      { id: 'eng-usa-001', home: 'England', away: 'USA' },
      { id: 'bra-gha-001', home: 'Brazil', away: 'Ghana' },
    ],
  },
  knockouts: {
    Round16: [{ id: 'r16-001', home: 'Winner Group A', away: 'Runner-up Group B' }],
    QuarterFinals: [{ id: 'qf-001', home: 'R16 Winner 1', away: 'R16 Winner 2' }],
    SemiFinals: [{ id: 'sf-001', home: 'QF Winner 1', away: 'QF Winner 2' }],
    Final: [{ id: 'final-001', home: 'Semi Winner 1', away: 'Semi Winner 2' }],
  },
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function ExpertBadge({ team, accuracy }: { team: string; accuracy?: bigint }) {
  const percentage = accuracy ? Number(accuracy) / 100 : 0
  if (percentage < 75) return null

  return (
    <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-black uppercase text-black">
      {team} Expert
    </span>
  )
}

function TournamentBracket({ onSelectMatch }: { onSelectMatch: (matchId: string) => void }) {
  return (
    <div className="bracket-grid">
      <section className="panel">
        <h2>Groups</h2>
        {Object.entries(fixtures.groups).map(([group, matches]) => (
          <div className="fixture-phase" key={group}>
            <h3>{group}</h3>
            {matches.map((match) => (
              <button type="button" key={match.id} onClick={() => onSelectMatch(match.id)}>
                {match.home} vs {match.away}
              </button>
            ))}
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Knockouts</h2>
        {Object.entries(fixtures.knockouts).map(([phase, matches]) => (
          <div className="fixture-phase" key={phase}>
            <h3>{phase.replace(/([A-Z])/g, ' $1').trim()}</h3>
            {matches.map((match) => (
              <button type="button" key={match.id} onClick={() => onSelectMatch(match.id)}>
                {match.home} vs {match.away}
              </button>
            ))}
          </div>
        ))}
      </section>
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

  if (!pundit) return <p className="muted-copy">Enter a valid pundit address.</p>

  if (!subscribed) {
    return (
      <div className="paywall">
        <p>Premium pundit notes are locked.</p>
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
          Pay 0.01 OKB
        </button>
      </div>
    )
  }

  return <p className="premium-copy">Premium predictions unlocked for {shortAddress(pundit)}.</p>
}

function App() {
  const oneHourFromNow = useMemo(() => BigInt(Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), [])
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  const [isViewingCenterMode, setViewingCenterMode] = useState(false)
  const [matchId, setMatchId] = useState('arg-nga-001')
  const [predictionOutcome, setPredictionOutcome] = useState(0)
  const [actualOutcome, setActualOutcome] = useState(0)
  const [punditAddress, setPunditAddress] = useState('')

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
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting)
        })
      },
      { rootMargin: '0px 0px -18% 0px', threshold: 0.28 },
    )

    animatedSections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isViewingCenterMode])

  function submitPrediction() {
    writeContract({
      address: CONTRACT_ADDRESSES.registry,
      abi: predictionRegistryAbi,
      functionName: 'submitPrediction',
      args: [matchId, predictionOutcome, oneHourFromNow],
    })
  }

  function resolveMatch() {
    writeContract({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'resolveMatch',
      args: [matchId, actualOutcome],
    })
  }

  function gradePundit() {
    if (!validPundit) return
    writeContract({
      address: CONTRACT_ADDRESSES.tracker,
      abi: accuracyTrackerAbi,
      functionName: 'gradePundit',
      args: [matchId, validPundit],
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
        <a href="#protocol-console">Protocol Console</a>
        <button type="button" onClick={() => setViewingCenterMode((current) => !current)}>
          {isViewingCenterMode ? 'Visual Mode' : 'Viewing Center'}
        </button>
        <ConnectButton chainStatus="name" accountStatus="address" showBalance={false} />
      </nav>

      {isViewingCenterMode ? (
        <section className="min-h-screen bg-black px-5 py-28 text-white" data-reveal>
          <h1 className="text-4xl font-black">Pundit Protocol Viewing Center</h1>
          <p className="mt-3 max-w-2xl text-lg text-zinc-300">
            Low-bandwidth tournament dashboard. Images, gradients, and decorative motion are removed.
          </p>
          <TournamentBracket onSelectMatch={setMatchId} />
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
          </section>
        ))
      )}

      <section id="protocol-console" className="console-section" data-reveal>
        <div className="console-heading">
          <p>Live on X Layer Testnet</p>
          <h1>Protocol Console</h1>
          <ExpertBadge team="Argentina" accuracy={accuracy} />
        </div>

        <TournamentBracket onSelectMatch={setMatchId} />

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

        <div className="workspace">
          <div className="panel">
            <h2>Prediction Submission</h2>
            <label>
              Match ID
              <input value={matchId} onChange={(event) => setMatchId(event.target.value)} />
            </label>
            <label>
              Pick
              <select
                value={predictionOutcome}
                onChange={(event) => setPredictionOutcome(Number(event.target.value))}
              >
                {outcomes.map((outcome, index) => (
                  <option key={outcome} value={index}>
                    {outcome}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={!address || isPending} onClick={submitPrediction}>
              Submit Prediction
            </button>
          </div>

          <div className="panel">
            <h2>Oracle & Reputation</h2>
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
            <label>
              Pundit address
              <input value={punditAddress} onChange={(event) => setPunditAddress(event.target.value)} />
            </label>
            <p className="premium-copy">Accuracy: {accuracy ? `${Number(accuracy) / 100}%` : '0%'}</p>
            <div className="button-row">
              <button type="button" disabled={isPending} onClick={resolveMatch}>
                Resolve Match
              </button>
              <button type="button" disabled={!validPundit || isPending} onClick={gradePundit}>
                Grade Pundit
              </button>
            </div>
          </div>

          <div className="panel">
            <h2>Paywall / Subscription</h2>
            <button type="button" disabled={isPending} onClick={setSubscriptionPrice}>
              Set My Price to 0.01 OKB
            </button>
            <PunditProfile pundit={validPundit} />
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
