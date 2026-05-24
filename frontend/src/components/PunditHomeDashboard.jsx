function compactAddress(address) {
  if (!address) return 'No wallet connected'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function PunditHomeDashboard({ onConnect, onEnter, walletAddress }) {
  return (
    <main className="home-dashboard">
      <section className="home-shell">
        <div className="home-copy">
          <p className="kicker">X Cup edition</p>
          <h1>Pundit Protocol</h1>
          <p>
            Enter the World Cup prediction desk, register your pundit name, unlock squad
            rooms, and build on-chain reputation on X Layer.
          </p>
          <div className="home-actions">
            <button type="button" onClick={walletAddress ? onEnter : onConnect}>
              {walletAddress ? 'Enter protocol' : 'Connect wallet'}
            </button>
            <button type="button" className="is-secondary" onClick={onEnter}>
              Preview app
            </button>
          </div>
        </div>

        <div className="home-glass-card">
          <div className="home-card-header">
            <span>Live match room</span>
            <strong>{walletAddress ? 'Wallet ready' : 'Registration pending'}</strong>
          </div>
          <div className="home-scoreboard">
            <div>
              <span>ARG</span>
              <strong>vs</strong>
              <span>NGA</span>
            </div>
            <p>Prediction market, subscriptions, oracle resolution, and reputation in one demo loop.</p>
          </div>
          <div className="home-wallet-pill">
            <span>Active wallet</span>
            <strong>{compactAddress(walletAddress)}</strong>
          </div>
        </div>
      </section>
    </main>
  )
}
