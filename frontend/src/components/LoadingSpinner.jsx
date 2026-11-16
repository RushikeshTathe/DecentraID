export default function LoadingSpinner({ label = 'Loading', small = false }) {
  return <span className={`spinner-wrap${small ? ' spinner-small' : ''}`} role="status"><span className="spinner" />{label}</span>
}