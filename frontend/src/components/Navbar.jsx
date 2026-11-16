import { ArrowUpRight, Fingerprint } from 'lucide-react'
import { Link } from 'react-router-dom'
import WalletConnect from './WalletConnect.jsx'

export default function Navbar() {
  return <header className="site-nav"><Link className="brand" to="/"><span className="brand-mark"><Fingerprint size={20} /></span><span>Decentra<span>ID</span></span></Link>
    <nav className="site-links"><Link to="/verify">Verify identity</Link><Link to="/register">Register</Link><a className="nav-document" href="https://ethereum.org/en/wallets/" target="_blank" rel="noreferrer">Wallet guide <ArrowUpRight size={13} /></a></nav><div className="nav-actions"><WalletConnect compact /></div>
  </header>
}