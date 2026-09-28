import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';
const savedSession = JSON.parse(localStorage.getItem('paperline_session') || 'null');

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body?.error || body?.message || body || 'Something went wrong');
  return body;
}

function App() {
  const [session, setSession] = useState(savedSession);
  const [view, setView] = useState('print');
  const [authMode, setAuthMode] = useState('login');
  const [notice, setNotice] = useState(null);

  const signOut = () => {
    localStorage.removeItem('paperline_session');
    setSession(null);
  };

  if (!session) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onSignedIn={setSession} setNotice={setNotice} notice={notice} />;
  }

  return (
    <Dashboard
      session={session}
      view={view}
      setView={setView}
      signOut={signOut}
      notice={notice}
      setNotice={setNotice}
    />
  );
}

function AuthScreen({ mode, setMode, onSignedIn, setNotice, notice }) {
  const [form, setForm] = useState({ username: '', mobile: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'register') {
        await request('/api/users/register', { method: 'POST', body: JSON.stringify(form) });
        setMode('login');
        setNotice({ type: 'success', text: 'Account created. Sign in to continue.' });
      } else {
        const result = await request('/api/users/login', {
          method: 'POST',
          body: JSON.stringify({ mobile: form.mobile, password: form.password }),
        });
        const nextSession = { token: result.token, user: result.user };
        localStorage.setItem('paperline_session', JSON.stringify(nextSession));
        onSignedIn(nextSession);
      }
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="brand-mark">P</div>
        <span>paperline</span>
        <div className="brand-copy">
          <p className="eyebrow">YOUR LOCAL PRINT DESK</p>
          <h1>Put your documents in motion.</h1>
          <p>Send a PDF to your trusted printer, set the details, and keep every job in one tidy place.</p>
          <div className="paper-stack" aria-hidden="true"><span /><span /><span /></div>
        </div>
        <p className="fine-print">Secure payments via Razorpay · A4 printing</p>
      </section>
      <section className="auth-panel">
        <div className="auth-heading">
          <p className="eyebrow">WELCOME TO PAPERLINE</p>
          <h2>{mode === 'login' ? 'Ready when you are.' : 'Make a little room.'}</h2>
          <p>{mode === 'login' ? 'Sign in to manage your print desk.' : 'Create an account to start printing.'}</p>
        </div>
        {notice && <div className="toast" role="status"><Notice notice={notice} /><button className="toast-close" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
        <form onSubmit={submit} className="form-stack">
          {mode === 'register' && <label>Full name<input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Aarav Mehta" /></label>}
          <label>Mobile number<input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="9876543210" inputMode="tel" /></label>
          <label>Password<input required minLength="6" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Enter workspace' : 'Create account'}<span>→</span></button>
        </form>
        <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setNotice(null); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}

function Dashboard({ session, view, setView, signOut, notice, setNotice }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-lockup"><div className="brand-mark">P</div><span>paperline</span></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          <button className={view === 'print' ? 'nav-item active' : 'nav-item'} onClick={() => setView('print')}><span className="nav-dot">+</span> New print</button>
          <button className={view === 'orders' ? 'nav-item active' : 'nav-item'} onClick={() => setView('orders')}><span className="nav-dot">≡</span> Print history</button>
        </nav>
        <div className="sidebar-bottom"><div className="status-line"><span /> Printer online</div><button className="signout" onClick={signOut}>Sign out</button></div>
      </aside>
      <main className="workspace">
        <header className="topbar"><div><p className="eyebrow">{view === 'print' ? 'NEW PRINT JOB' : 'YOUR ACTIVITY'}</p><h1>{view === 'print' ? 'Good to see you, ' : 'Print history'}{view === 'print' && <em>{session.user.username.split(' ')[0]}.</em>}</h1></div><div className="avatar">{session.user.username.charAt(0).toUpperCase()}</div></header>
        {notice && <Notice notice={notice} />}
        {view === 'print' ? <PrintDesk session={session} setNotice={setNotice} /> : <OrderHistory session={session} setNotice={setNotice} />}
      </main>
    </div>
  );
}

function PrintDesk({ session, setNotice }) {
  const [form, setForm] = useState({ filePath: '', range: '', copies: 1, color: 'black' });
  const [busy, setBusy] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const startPayment = async (event) => {
    event.preventDefault();
    if (!form.filePath.trim()) return setNotice({ type: 'error', text: 'Add the PDF path from the printer computer.' });
    setBusy(true);
    setNotice(null);
    try {
      let calculatedPageCount = 0;
      const order = await request('/api/orders/create', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ filePath: form.filePath, color: form.color }) });
      if(form.color === 'color') {
        calculatedPageCount = Math.max(1, Math.round(order.amount / 2000));
      }else{
        calculatedPageCount = Math.max(1, Math.round(order.amount / 1000));
      }
      setPageCount(calculatedPageCount);
      const config = await request('/api/config/razorpay');
      if (!window.Razorpay) await loadRazorpay();
      const checkout = new window.Razorpay({
        key: config.keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Paperline',
        description: `${calculatedPageCount} page print job`,
        prefill: { name: session.user.username, contact: session.user.mobile },
        theme: { color: '#d95f3f' },
        handler: async (payment) => {
          try {
            const paymentDetails = {
              razorpay_order_id: payment.razorpay_order_id,
              razorpay_payment_id: payment.razorpay_payment_id,
              razorpay_signature: payment.razorpay_signature,
              file_path: form.filePath,
              range: form.range || `1-${calculatedPageCount}`,
              copies: Number(form.copies),
              color: form.color,
            };
            if (!paymentDetails.razorpay_order_id || !paymentDetails.razorpay_payment_id || !paymentDetails.razorpay_signature) {
              throw new Error('Razorpay did not return a complete payment confirmation.');
            }
            setNotice({ type: 'success', text: 'Payment received. Your print is in the queue.' });
            await request('/api/orders/verify', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: JSON.stringify(paymentDetails) });
            setNotice({ type: 'success', text: 'Payment verified. Your print job is queued.' });
            setForm({ filePath: '', range: '', copies: 1, color: 'black' });
          } catch (error) { setNotice({ type: 'error', text: error.message }); }
        },
      });
      checkout.open();
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const pricePerPage = form.color === 'color' ? 20 : 10;

  return <section className="print-layout"><div className="print-card"><div className="card-heading"><div><span className="step">01</span><h2>Choose a document</h2><p>Use a PDF path available to the printer computer.</p></div><span className="file-badge">PDF</span></div><label className="path-input"><span>File path</span><input value={form.filePath} onChange={(e) => setForm({ ...form, filePath: e.target.value })} placeholder="C:\Documents\assignment.pdf" /></label><p className="field-note">The backend reads this path directly. Upload support can be added later.</p><div className="divider" /><div className="card-heading"><div><span className="step">02</span><h2>Set your preferences</h2><p>Small details make a clean finish.</p></div></div><div className="form-grid"><label>Page range<input value={form.range} onChange={(e) => setForm({ ...form, range: e.target.value })} placeholder="All pages" /></label><label>Copies<input type="number" min="1" max="99" value={form.copies} onChange={(e) => setForm({ ...form, copies: e.target.value })} /></label></div><div className="color-choice"><span>Ink</span><div className="segmented"><button type="button" className={form.color === 'black' ? 'selected' : ''} onClick={() => setForm({ ...form, color: 'black' })}><i className="swatch black" /> Black & white</button><button type="button" className={form.color === 'color' ? 'selected' : ''} onClick={() => setForm({ ...form, color: 'color' })}><i className="swatch color" /> Color</button></div></div><button className="primary-button print-button" onClick={startPayment} disabled={busy}>{busy ? 'Preparing checkout...' : 'Continue to payment'}<span>→</span></button></div><aside className="price-aside"><span className="aside-kicker">ESTIMATE</span><div className="price">₹{pricePerPage.toFixed(2)}<small>/ page</small></div><p>Final amount is calculated from your PDF's page count.</p><div className="aside-rule" /><dl><div><dt>Paper</dt><dd>A4</dd></div><div><dt>Payment</dt><dd>Razorpay</dd></div><div><dt>Turnaround</dt><dd>On queue</dd></div></dl><div className="receipt-note"><span>✦</span> Your receipt and status will be saved to print history.</div></aside></section>;
}

function OrderHistory({ session, setNotice }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { request(`/api/orders/getall/${session.user.id}`, { headers: { Authorization: `Bearer ${session.token}` } }).then(setOrders).catch((error) => setNotice({ type: 'error', text: error.message })).finally(() => setLoading(false)); }, [session, setNotice]);
  return <section className="history-card"><div className="history-head"><div><h2>Recent print jobs</h2><p>A record of everything sent through Paperline.</p></div><span className="count-pill">{orders.length} jobs</span></div>{loading ? <div className="empty-state">Loading your print history...</div> : orders.length === 0 ? <div className="empty-state"><strong>No print jobs yet.</strong><br />Your first one will show up here.</div> : <div className="order-list">{orders.map((order) => <div className="order-row" key={order._id}><div className="document-icon">PDF</div><div className="order-details"><strong>{order.file_path.split(/[\\/]/).pop()}</strong><span>{order.pages} pages · {order.copies} {order.copies === 1 ? 'copy' : 'copies'} · {order.color}</span></div><span className={`order-status ${order.print_status}`}>{order.print_status}</span></div>)}</div>}</section>;
}

function Notice({ notice }) { return <div className={`notice ${notice.type}`}>{notice.text}</div>; }
function loadRazorpay() { return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = reject; document.body.appendChild(script); }); }

export default App;
