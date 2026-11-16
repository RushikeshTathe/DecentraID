export default function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }) {
  return <article className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={19} strokeWidth={1.8} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}