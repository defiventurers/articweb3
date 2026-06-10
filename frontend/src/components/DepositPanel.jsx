export function DepositPanel() {
  return (
    <div className="deposit-panel">
      <strong>USDC Game Balance</strong>
      <span>Available: 0.00 USDC</span>
      <span>Locked: 0.00 USDC</span>
      <button className="secondary-btn" disabled>
        Deposit USDC Coming Soon
      </button>
      <button className="secondary-btn" disabled>
        Withdraw USDC Coming Soon
      </button>
    </div>
  );
}
