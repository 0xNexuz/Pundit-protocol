import { useEffect, useMemo, useState } from 'react'
import { formatEther, isAddress } from 'ethers'
import {
  CONTRACT_ADDRESSES,
  getProtocolContracts,
  okbToWei,
} from './protocol'
import './App.css'

const outcomes = ['Home win', 'Draw', 'Away win']

type PredictionRow = {
  pundit: string
  matchId: string
  predictedOutcome: bigint
  timestamp: bigint
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function App() {
  const oneHourFromNow = useMemo(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000)
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
  }, [])

  const [account, setAccount] = useState('')
  const [status, setStatus] = useState('Ready to connect to X Layer testnet.')
  const [error, setError] = useState('')
  const [matchId, setMatchId] = useState('arsenal-vs-city-001')
  const [kickoffTime, setKickoffTime] = useState(oneHourFromNow)
  const [predictionOutcome, setPredictionOutcome] = useState('0')
  const [actualOutcome, setActualOutcome] = useState('0')
  const [punditAddress, setPunditAddress] = useState('')
  const [subscriptionPrice, setSubscriptionPrice] = useState('0.01')
  const [subscriberAddress, setSubscriberAddress] = useState('')
  const [accuracyAddress, setAccuracyAddress] = useState('')
  const [result, setResult] = useState('No on-chain reads yet.')
  const [predictions, setPredictions] = useState<PredictionRow[]>([])

  useEffect(() => {
    const animatedSections = document.querySelectorAll<HTMLElement>('[data-reveal]')

    if (!('IntersectionObserver' in window)) {
      animatedSections.forEach((section) => section.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      },
    )

    animatedSections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  async function run(label: string, action: () => Promise<string | void>) {
    setError('')
    setStatus(`${label}...`)

    try {
      const message = await action()
      setStatus(message || `${label} complete.`)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Transaction failed.'
      setError(message)
      setStatus('Ready.')
    }
  }

  async function connectWallet() {
    await run('Connecting wallet', async () => {
      const { signer } = await getProtocolContracts()
      const address = await signer.getAddress()
      setAccount(address)
      setPunditAddress((current) => current || address)
      setSubscriberAddress((current) => current || address)
      setAccuracyAddress((current) => current || address)
      return `Connected ${shortAddress(address)} on X Layer testnet.`
    })
  }

  async function submitPrediction() {
    await run('Submitting prediction', async () => {
      const kickoff = Math.floor(new Date(kickoffTime).getTime() / 1000)
      const { registry } = await getProtocolContracts()
      const tx = await registry.submitPrediction(matchId, Number(predictionOutcome), kickoff)
      setResult(`Prediction transaction sent: ${tx.hash}`)
      await tx.wait()
      return 'Prediction confirmed on-chain.'
    })
  }

  async function loadPredictions() {
    await run('Loading predictions', async () => {
      const { registry } = await getProtocolContracts()
      const rows = (await registry.getPredictionsForMatch(matchId)) as PredictionRow[]
      setPredictions(rows)
      setResult(`${rows.length} prediction(s) found for ${matchId}.`)
      return 'Predictions loaded.'
    })
  }

  async function setPrice() {
    await run('Setting subscription price', async () => {
      const { subscription } = await getProtocolContracts()
      const tx = await subscription.setSubscriptionPrice(okbToWei(subscriptionPrice))
      setResult(`Price transaction sent: ${tx.hash}`)
      await tx.wait()
      return `Subscription price set to ${subscriptionPrice} OKB.`
    })
  }

  async function subscribeToPundit() {
    await run('Subscribing', async () => {
      if (!isAddress(punditAddress)) {
        throw new Error('Enter a valid pundit address.')
      }

      const { subscription } = await getProtocolContracts()
      const price = await subscription.punditMonthlyPrice(punditAddress)
      const tx = await subscription.subscribe(punditAddress, { value: price })
      setResult(`Subscribe transaction sent: ${tx.hash}`)
      await tx.wait()
      return `Subscribed to ${shortAddress(punditAddress)}.`
    })
  }

  async function checkSubscription() {
    await run('Checking subscription', async () => {
      if (!isAddress(subscriberAddress) || !isAddress(punditAddress)) {
        throw new Error('Enter valid subscriber and pundit addresses.')
      }

      const { subscription } = await getProtocolContracts()
      const active = await subscription.isSubscribed(subscriberAddress, punditAddress)
      const price = await subscription.punditMonthlyPrice(punditAddress)
      setResult(
        `${shortAddress(subscriberAddress)} is ${
          active ? 'subscribed' : 'not subscribed'
        } to ${shortAddress(punditAddress)}. Current price: ${formatEther(price)} OKB.`,
      )
      return 'Subscription checked.'
    })
  }

  async function resolveMatch() {
    await run('Resolving match', async () => {
      const { tracker } = await getProtocolContracts()
      const tx = await tracker.resolveMatch(matchId, Number(actualOutcome))
      setResult(`Resolve transaction sent: ${tx.hash}`)
      await tx.wait()
      return 'Match resolved. Only the contract owner can run this successfully.'
    })
  }

  async function gradePundit() {
    await run('Grading pundit', async () => {
      if (!isAddress(punditAddress)) {
        throw new Error('Enter a valid pundit address.')
      }

      const { tracker } = await getProtocolContracts()
      const tx = await tracker.gradePundit(matchId, punditAddress)
      setResult(`Grade transaction sent: ${tx.hash}`)
      await tx.wait()
      return 'Pundit graded for this match.'
    })
  }

  async function loadAccuracy() {
    await run('Loading accuracy', async () => {
      if (!isAddress(accuracyAddress)) {
        throw new Error('Enter a valid address.')
      }

      const { tracker } = await getProtocolContracts()
      const accuracy = await tracker.getAccuracy(accuracyAddress)
      const stats = await tracker.stats(accuracyAddress)
      const percent = (Number(accuracy) / 100).toFixed(2)
      setResult(
        `${shortAddress(accuracyAddress)} accuracy: ${percent}% | Wins: ${stats.wins} | Losses: ${stats.losses} | Resolved: ${stats.totalResolved}`,
      )
      return 'Accuracy loaded.'
    })
  }

  async function withdrawEarnings() {
    await run('Withdrawing earnings', async () => {
      const { subscription } = await getProtocolContracts()
      const tx = await subscription.withdrawEarnings()
      setResult(`Withdraw transaction sent: ${tx.hash}`)
      await tx.wait()
      return 'Earnings withdrawn.'
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar" data-reveal>
        <div>
          <p className="eyebrow">Pundit Protocol</p>
          <h1>X Layer Control Panel</h1>
        </div>
        <button type="button" className="primary-button" onClick={connectWallet}>
          {account ? shortAddress(account) : 'Connect wallet'}
        </button>
      </header>

      <section className="status-panel" data-reveal>
        <div>
          <span>Status</span>
          <strong>{status}</strong>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="contract-grid" data-reveal>
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
      </section>

      <section className="workspace">
        <div className="panel" data-reveal>
          <h2>Predictions</h2>
          <label>
            Match ID
            <input value={matchId} onChange={(event) => setMatchId(event.target.value)} />
          </label>
          <label>
            Kickoff time
            <input
              type="datetime-local"
              value={kickoffTime}
              onChange={(event) => setKickoffTime(event.target.value)}
            />
          </label>
          <label>
            Pick
            <select
              value={predictionOutcome}
              onChange={(event) => setPredictionOutcome(event.target.value)}
            >
              {outcomes.map((outcome, index) => (
                <option key={outcome} value={index}>
                  {outcome}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button type="button" onClick={submitPrediction}>
              Submit prediction
            </button>
            <button type="button" onClick={loadPredictions}>
              Load match predictions
            </button>
          </div>
        </div>

        <div className="panel" data-reveal>
          <h2>Subscriptions</h2>
          <label>
            Pundit address
            <input
              value={punditAddress}
              onChange={(event) => setPunditAddress(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <label>
            Monthly price in OKB
            <input
              value={subscriptionPrice}
              onChange={(event) => setSubscriptionPrice(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            Subscriber address
            <input
              value={subscriberAddress}
              onChange={(event) => setSubscriberAddress(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={setPrice}>
              Set my price
            </button>
            <button type="button" onClick={subscribeToPundit}>
              Subscribe
            </button>
            <button type="button" onClick={checkSubscription}>
              Check access
            </button>
            <button type="button" onClick={withdrawEarnings}>
              Withdraw
            </button>
          </div>
        </div>

        <div className="panel" data-reveal>
          <h2>Accuracy Tracker</h2>
          <label>
            Actual result
            <select value={actualOutcome} onChange={(event) => setActualOutcome(event.target.value)}>
              {outcomes.map((outcome, index) => (
                <option key={outcome} value={index}>
                  {outcome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Address to inspect
            <input
              value={accuracyAddress}
              onChange={(event) => setAccuracyAddress(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={resolveMatch}>
              Resolve match
            </button>
            <button type="button" onClick={gradePundit}>
              Grade pundit
            </button>
            <button type="button" onClick={loadAccuracy}>
              Load accuracy
            </button>
          </div>
        </div>

        <div className="panel output-panel" data-reveal>
          <h2>On-chain Output</h2>
          <p>{result}</p>
          {predictions.length > 0 && (
            <div className="prediction-list">
              {predictions.map((prediction) => (
                <div key={`${prediction.pundit}-${prediction.timestamp.toString()}`}>
                  <strong>{shortAddress(prediction.pundit)}</strong>
                  <span>{outcomes[Number(prediction.predictedOutcome)]}</span>
                  <small>{new Date(Number(prediction.timestamp) * 1000).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
