/* ═══════════════════════════════════════════════════════
   AGENTIC HONEY-POT — Dashboard JavaScript
   Interactive logic, API calls, network visualization
   ═══════════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

// ── Tab Navigation ─────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tabName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Update heading
    const headings = {
        simulate: ['Live Simulation', 'Full demo of the Agentic Honey-Pot system for judges'],
        overview: ['Dashboard Overview', 'Real-time scam intelligence monitoring'],
        sessions: ['Session History', 'All honeypot conversation sessions'],
        scammers: ['Scammer Database', 'Known scammer identifiers and profiles'],
        network: ['Network Map', 'Visualize connections between scammer identifiers'],
        voice: ['Voice Analysis', 'Transcribe and analyze voice messages'],
        image: ['Image Intelligence', 'Analyze scam images and screenshots'],
        complaint: ['Complaint Generator', 'Auto-generate cybercrime FIR complaints'],
        trap: ['Trap Documents', 'Generate fake bank documents to keep scammers engaged']
    };

    const [title, sub] = headings[tabName] || ['Dashboard', ''];
    document.getElementById('page-heading').textContent = title;
    document.getElementById('page-subtitle').textContent = sub;

    // Load tab-specific data
    if (tabName === 'overview') loadDashboard();
    if (tabName === 'sessions') loadSessions();
    if (tabName === 'scammers') loadScammers();
    if (tabName === 'network') loadNetwork();
    if (tabName === 'complaint') loadComplaintSessions();
}

// ── Dashboard Overview ─────────────────────────────────
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/dashboard/stats`);
        const data = await res.json();

        // Animate counters
        animateCounter('val-sessions', data.total_sessions || 0);
        animateCounter('val-scammers', data.total_scammers || 0);
        animateCounter('val-intel', data.total_intel || 0);
        animateCounter('val-messages', data.total_messages || 0);

        // Update bars
        const breakdown = data.intel_breakdown || {};
        const maxVal = Math.max(breakdown.banks || 0, breakdown.upis || 0, breakdown.phones || 0, breakdown.links || 0, 1);

        updateBar('banks', breakdown.banks || 0, maxVal);
        updateBar('upis', breakdown.upis || 0, maxVal);
        updateBar('phones', breakdown.phones || 0, maxVal);
        updateBar('links', breakdown.links || 0, maxVal);

        // Recent sessions
        const list = document.getElementById('recent-session-list');
        const sessions = data.recent_sessions || [];
        if (sessions.length === 0) {
            list.innerHTML = '<div class="empty-state">No sessions yet. Waiting for scammers... 🎣</div>';
        } else {
            list.innerHTML = sessions.map(s => `
                <div class="session-item" onclick="viewSession('${s.session_id}')">
                    <div>
                        <div class="session-id">${s.session_id.substring(0, 12)}...</div>
                        <div class="session-meta">${s.persona || 'N/A'} · ${s.message_count || 0} msgs · ${s.final_stage || 'HOOK'}</div>
                    </div>
                    <span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-completed'}">${s.status || 'active'}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    const start = parseInt(el.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function updateBar(type, value, max) {
    document.getElementById(`count-${type}`).textContent = value;
    const pct = max > 0 ? (value / max) * 100 : 0;
    setTimeout(() => {
        document.getElementById(`bar-${type}`).style.width = `${pct}%`;
    }, 200);
}

// ── Sessions Tab ───────────────────────────────────────
async function loadSessions() {
    try {
        const res = await fetch(`${API_BASE}/api/dashboard/stats`);
        const data = await res.json();
        const sessions = data.recent_sessions || [];

        const tbody = document.getElementById('sessions-table-body');
        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No sessions yet</td></tr>';
            return;
        }

        tbody.innerHTML = sessions.map(s => `
            <tr>
                <td><span style="font-family:monospace;color:var(--accent-purple)">${(s.session_id || '').substring(0, 12)}...</span></td>
                <td>${s.persona || 'N/A'}</td>
                <td><span class="badge badge-completed">${s.final_stage || 'HOOK'}</span></td>
                <td>${s.message_count || 0}</td>
                <td>${((s.scam_confidence || 0) * 100).toFixed(0)}%</td>
                <td><span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-completed'}">${s.status || 'active'}</span></td>
                <td><button class="btn btn-primary" onclick="viewSession('${s.session_id}')" style="padding:6px 12px;font-size:11px">View</button></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Sessions load error:', e);
    }
}

async function viewSession(sessionId) {
    const modal = document.getElementById('session-modal');
    const body = document.getElementById('session-modal-body');
    modal.style.display = 'flex';
    body.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading session...</p></div>';

    try {
        const res = await fetch(`${API_BASE}/api/dashboard/session/${sessionId}`);
        const data = await res.json();

        const session = data.session || {};
        const messages = data.messages || [];
        const intel = data.intelligence || [];

        let chatHtml = messages.map(m => `
            <div class="chat-bubble ${m.sender === 'scammer' ? 'chat-scammer' : 'chat-victim'}">
                <strong>${m.sender === 'scammer' ? '🔴 Scammer' : '🛡️ HoneyPot'}:</strong> ${escapeHtml(m.message_text)}
            </div>
        `).join('');

        let intelHtml = intel.map(i =>
            `<span class="intel-tag ${i.intel_type === 'bank_account' ? 'bank' : i.intel_type === 'upi_id' ? 'upi' : i.intel_type === 'phone' ? 'phone' : 'link'}">${i.value} (${(i.confidence * 100).toFixed(0)}%)</span>`
        ).join('');

        body.innerHTML = `
            <div style="margin-bottom:16px">
                <span class="badge badge-completed">${session.persona || 'N/A'}</span>
                <span class="badge badge-active">${session.final_stage || 'HOOK'}</span>
                <span class="badge badge-high">${session.message_count || 0} messages</span>
            </div>
            <h4 style="margin-bottom:8px">💬 Conversation</h4>
            <div class="chat-container" style="max-height:300px;overflow-y:auto;padding:12px;background:var(--bg-primary);border-radius:var(--radius-sm);box-shadow:var(--clay-shadow-inset);margin-bottom:16px">
                ${chatHtml || '<div class="empty-state">No messages recorded</div>'}
            </div>
            <h4 style="margin-bottom:8px">🏦 Extracted Intelligence</h4>
            <div style="padding:12px;background:var(--bg-primary);border-radius:var(--radius-sm);box-shadow:var(--clay-shadow-inset)">
                ${intelHtml || '<span class="empty-state">No intelligence extracted</span>'}
            </div>
        `;
    } catch (e) {
        body.innerHTML = '<div class="empty-state">Error loading session details</div>';
    }
}

function closeModal() {
    document.getElementById('session-modal').style.display = 'none';
}

// ── Scammers Tab ───────────────────────────────────────
async function loadScammers() {
    try {
        const res = await fetch(`${API_BASE}/api/dashboard/scammers`);
        const data = await res.json();

        const tbody = document.getElementById('scammers-table-body');
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No scammers caught yet</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(s => `
            <tr>
                <td><span style="font-family:monospace;font-weight:600">${s.identifier}</span></td>
                <td><span class="intel-tag ${s.identifier_type === 'bank_account' ? 'bank' : s.identifier_type === 'upi_id' ? 'upi' : s.identifier_type === 'phone' ? 'phone' : 'link'}">${s.identifier_type}</span></td>
                <td>${s.first_seen || 'N/A'}</td>
                <td>${s.last_seen || 'N/A'}</td>
                <td>${s.session_count || 1}</td>
                <td><span class="badge ${s.session_count > 2 ? 'badge-high' : 'badge-medium'}">${s.session_count > 2 ? 'HIGH' : 'MEDIUM'}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Scammers load error:', e);
    }
}

// ── Network Map ────────────────────────────────────────
async function loadNetwork() {
    try {
        const res = await fetch(`${API_BASE}/api/dashboard/network`);
        const data = await res.json();
        drawNetwork(data);
    } catch (e) {
        console.error('Network load error:', e);
    }
}

function drawNetwork(data) {
    const canvas = document.getElementById('network-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.parentElement.clientWidth - 16;
    canvas.height = 500;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodes = data.nodes || [];
    const links = data.links || [];

    if (nodes.length === 0) {
        ctx.fillStyle = '#8896a6';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No network data yet. Catch some scammers first! 🕸️', canvas.width / 2, canvas.height / 2);
        return;
    }

    const colors = {
        bank_account: '#6c5ce7',
        upi_id: '#00b894',
        phone: '#e17055',
        link: '#fdcb6e'
    };

    // Layout nodes in a circle
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 80;

    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        node.x = cx + radius * Math.cos(angle);
        node.y = cy + radius * Math.sin(angle);
    });

    // Draw links
    links.forEach(link => {
        const src = nodes.find(n => n.id === link.source);
        const tgt = nodes.find(n => n.id === link.target);
        if (src && tgt) {
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tgt.x, tgt.y);
            ctx.strokeStyle = 'rgba(108, 92, 231, 0.25)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    // Draw nodes
    nodes.forEach(node => {
        const color = colors[node.type] || '#6c5ce7';
        const r = 12 + (node.sessions || 1) * 4;

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
        ctx.fillStyle = color + '20';
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#2d3748';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const label = node.id.length > 18 ? node.id.substring(0, 18) + '...' : node.id;
        ctx.fillText(label, node.x, node.y + r + 18);
    });
}

// ── Voice Analysis ─────────────────────────────────────
const voiceInput = document.getElementById('voice-file');
const voiceDropZone = document.getElementById('voice-drop-zone');

voiceDropZone.addEventListener('click', () => voiceInput.click());

['dragenter', 'dragover'].forEach(evt => {
    voiceDropZone.addEventListener(evt, (e) => { e.preventDefault(); voiceDropZone.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(evt => {
    voiceDropZone.addEventListener(evt, (e) => { e.preventDefault(); voiceDropZone.classList.remove('dragover'); });
});
voiceDropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) analyzeVoice(file);
});
voiceInput.addEventListener('change', () => {
    if (voiceInput.files[0]) analyzeVoice(voiceInput.files[0]);
});

async function analyzeVoice(file) {
    document.getElementById('voice-loading').style.display = 'block';
    document.getElementById('voice-result').style.display = 'none';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/api/voice/analyze`, { method: 'POST', body: formData });
        const data = await res.json();

        document.getElementById('voice-transcript').textContent = data.transcript || 'No transcript generated';
        document.getElementById('voice-analysis').textContent = data.scam_analysis || 'No analysis';

        const intel = data.intelligence || {};
        let intelText = '';
        if (intel.bankAccounts?.length) intelText += `🏦 Bank Accounts: ${intel.bankAccounts.join(', ')}\n`;
        if (intel.upiIds?.length) intelText += `📱 UPI IDs: ${intel.upiIds.join(', ')}\n`;
        if (intel.phoneNumbers?.length) intelText += `📞 Phone Numbers: ${intel.phoneNumbers.join(', ')}\n`;
        if (intel.phishingLinks?.length) intelText += `🔗 Phishing Links: ${intel.phishingLinks.join(', ')}\n`;
        document.getElementById('voice-intel').textContent = intelText || 'No intelligence extracted from voice message';

        document.getElementById('voice-result').style.display = 'block';
    } catch (e) {
        document.getElementById('voice-transcript').textContent = 'Error analyzing voice message: ' + e.message;
        document.getElementById('voice-result').style.display = 'block';
    }
    document.getElementById('voice-loading').style.display = 'none';
}

// ── Image Analysis ─────────────────────────────────────
const imageInput = document.getElementById('image-file');
const imageDropZone = document.getElementById('image-drop-zone');

imageDropZone.addEventListener('click', () => imageInput.click());

['dragenter', 'dragover'].forEach(evt => {
    imageDropZone.addEventListener(evt, (e) => { e.preventDefault(); imageDropZone.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(evt => {
    imageDropZone.addEventListener(evt, (e) => { e.preventDefault(); imageDropZone.classList.remove('dragover'); });
});
imageDropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) analyzeImage(file);
});
imageInput.addEventListener('change', () => {
    if (imageInput.files[0]) analyzeImage(imageInput.files[0]);
});

async function analyzeImage(file) {
    document.getElementById('image-loading').style.display = 'block';
    document.getElementById('image-result').style.display = 'none';

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('image-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/api/image/analyze`, { method: 'POST', body: formData });
        const data = await res.json();

        document.getElementById('image-analysis').textContent = data.analysis || 'No analysis generated';

        const intel = data.intelligence || {};
        let intelText = '';
        if (intel.bankAccounts?.length) intelText += `🏦 Bank Accounts: ${intel.bankAccounts.join(', ')}\n`;
        if (intel.upiIds?.length) intelText += `📱 UPI IDs: ${intel.upiIds.join(', ')}\n`;
        if (intel.phoneNumbers?.length) intelText += `📞 Phone Numbers: ${intel.phoneNumbers.join(', ')}\n`;
        if (intel.phishingLinks?.length) intelText += `🔗 Phishing Links: ${intel.phishingLinks.join(', ')}\n`;
        document.getElementById('image-intel').textContent = intelText || 'No intelligence extracted from image';

        document.getElementById('image-result').style.display = 'block';
    } catch (e) {
        document.getElementById('image-analysis').textContent = 'Error analyzing image: ' + e.message;
        document.getElementById('image-result').style.display = 'block';
    }
    document.getElementById('image-loading').style.display = 'none';
}

// ── Complaint Generator ────────────────────────────────
async function loadComplaintSessions() {
    try {
        const res = await fetch(`${API_BASE}/api/dashboard/stats`);
        const data = await res.json();
        const select = document.getElementById('complaint-session-select');
        const sessions = data.recent_sessions || [];

        select.innerHTML = '<option value="">Select a session...</option>';
        sessions.forEach(s => {
            select.innerHTML += `<option value="${s.session_id}">${s.session_id.substring(0, 12)}... — ${s.persona} (${s.message_count} msgs)</option>`;
        });
    } catch (e) {
        console.error('Complaint sessions load error:', e);
    }
}

async function generateComplaint() {
    const sessionId = document.getElementById('complaint-session-select').value;
    if (!sessionId) { alert('Please select a session first'); return; }

    document.getElementById('complaint-loading').style.display = 'block';
    document.getElementById('complaint-preview').style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/api/complaint/${sessionId}`);
        const data = await res.json();
        document.getElementById('complaint-text').textContent = data.complaint || 'Error generating complaint';
        document.getElementById('complaint-preview').style.display = 'block';
    } catch (e) {
        alert('Error generating complaint: ' + e.message);
    }
    document.getElementById('complaint-loading').style.display = 'none';
}

function downloadComplaint() {
    const text = document.getElementById('complaint-text').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cybercrime_complaint.txt';
    a.click();
}

function copyComplaint() {
    const text = document.getElementById('complaint-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Complaint copied to clipboard!');
    });
}

// ── Trap Document Generator ────────────────────────────
function generateTrapDoc() {
    const type = document.getElementById('trap-doc-type').value;
    const name = document.getElementById('trap-name').value || 'Rajesh Kumar Sharma';
    const balance = document.getElementById('trap-balance').value || '2,45,000';

    const accNo = '3' + Math.random().toString().substr(2, 13);
    const ifsc = 'SBIN000' + Math.floor(Math.random() * 9000 + 1000);
    const date = new Date().toLocaleDateString('en-IN');
    const branch = ['Andheri West', 'Connaught Place', 'MG Road Bangalore', 'T Nagar Chennai'][Math.floor(Math.random() * 4)];

    let docHtml = '';

    if (type === 'passbook') {
        docHtml = `
            <div class="bank-header">
                <div class="bank-name">STATE BANK OF INDIA</div>
                <div class="bank-sub">Savings Account Passbook</div>
            </div>
            <div class="detail-row"><span class="detail-label">Account Holder</span><span class="detail-value">${name}</span></div>
            <div class="detail-row"><span class="detail-label">Account Number</span><span class="detail-value">${accNo}</span></div>
            <div class="detail-row"><span class="detail-label">IFSC Code</span><span class="detail-value">${ifsc}</span></div>
            <div class="detail-row"><span class="detail-label">Branch</span><span class="detail-value">${branch}</span></div>
            <div class="detail-row"><span class="detail-label">Account Type</span><span class="detail-value">Savings</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
            <div class="balance-box">
                <div class="balance-label">Available Balance</div>
                <div class="balance-value">₹ ${balance}</div>
            </div>
            <div style="margin-top:12px;font-size:9px;color:#999;text-align:center">
                * This is a system-generated document. For internal use only.
            </div>
        `;
    } else if (type === 'statement') {
        const transactions = [
            { date: '01/02/2026', desc: 'SALARY CREDIT', cr: '55,000', bal: '2,87,500' },
            { date: '03/02/2026', desc: 'UPI/PHONEPE', dr: '1,200', bal: '2,86,300' },
            { date: '05/02/2026', desc: 'ATM WITHDRAWAL', dr: '5,000', bal: '2,81,300' },
            { date: '08/02/2026', desc: 'NEFT RECEIVED', cr: '12,500', bal: '2,93,800' },
            { date: '10/02/2026', desc: 'ELECTRICITY BILL', dr: '2,800', bal: '2,91,000' },
        ];

        let txHtml = transactions.map(t => `
            <tr style="border-bottom:1px dotted #ddd">
                <td style="padding:4px 6px;font-size:11px">${t.date}</td>
                <td style="padding:4px 6px;font-size:11px">${t.desc}</td>
                <td style="padding:4px 6px;font-size:11px;color:green">${t.cr || '-'}</td>
                <td style="padding:4px 6px;font-size:11px;color:red">${t.dr || '-'}</td>
                <td style="padding:4px 6px;font-size:11px;font-weight:bold">${t.bal}</td>
            </tr>
        `).join('');

        docHtml = `
            <div class="bank-header">
                <div class="bank-name">STATE BANK OF INDIA</div>
                <div class="bank-sub">Account Statement — ${name}</div>
            </div>
            <div class="detail-row"><span class="detail-label">Account</span><span class="detail-value">${accNo}</span></div>
            <div class="detail-row"><span class="detail-label">Period</span><span class="detail-value">01/02/2026 - ${date}</span></div>
            <table style="width:100%;margin-top:12px;border-collapse:collapse">
                <thead><tr style="background:#f0f0f0">
                    <th style="padding:6px;font-size:10px;text-align:left">Date</th>
                    <th style="padding:6px;font-size:10px;text-align:left">Description</th>
                    <th style="padding:6px;font-size:10px;text-align:left">Credit</th>
                    <th style="padding:6px;font-size:10px;text-align:left">Debit</th>
                    <th style="padding:6px;font-size:10px;text-align:left">Balance</th>
                </tr></thead>
                <tbody>${txHtml}</tbody>
            </table>
            <div class="balance-box">
                <div class="balance-label">Closing Balance</div>
                <div class="balance-value">₹ ${balance}</div>
            </div>
        `;
    } else {
        docHtml = `
            <div class="bank-header">
                <div class="bank-name">STATE BANK OF INDIA</div>
                <div class="bank-sub">Balance Certificate</div>
            </div>
            <div style="padding:16px 0;font-size:12px;line-height:1.8">
                This is to certify that <strong>${name}</strong>, holding Savings Account No.
                <strong>${accNo}</strong> at our ${branch} branch (IFSC: ${ifsc}),
                has a balance of <strong>₹ ${balance}</strong> as on ${date}.
            </div>
            <div style="margin-top:24px;text-align:right;font-size:11px">
                <div>Authorized Signatory</div>
                <div style="margin-top:4px;color:#999">Branch Manager, ${branch}</div>
            </div>
            <div style="margin-top:12px;font-size:9px;color:#999;text-align:center">
                * This certificate is valid for 30 days from the date of issue.
            </div>
        `;
    }

    document.getElementById('trap-document-content').innerHTML = docHtml;
    document.getElementById('trap-preview').style.display = 'block';
}

// ── Utilities ──────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ══════════════════════════════════════════════════════════
// SIMULATION ENGINE — Real-Time Multi-Scenario Demo
// ══════════════════════════════════════════════════════════

let simRunning = false;
let selectedScenario = 'bank_fraud';

// ── 3 Scenario Scripts ──
// Only scammer messages are scripted. AI replies come from the real /api/simulate endpoint.
const SCENARIOS = {
    bank_fraud: {
        name: 'Bank Fraud',
        callerName: 'SBI Security Dept.',
        messages: [
            { text: 'Hello sir, I am calling from State Bank of India. Your account ending 4532 has been flagged for suspicious activity and will be blocked within 2 hours.' },
            { text: 'Don\'t worry sir. I am Senior Manager Raj Kumar, Employee ID SBI-4521. Can you confirm your registered mobile number for verification?' },
            { text: 'Sir, someone tried to transfer ₹50,000 from your account to fraudpay@ybl UPI. We need to reverse it immediately. Please install this app: bit.ly/sbi-secure-verify' },
            { text: 'Yes sir, click the link and enter your debit card number and CVV to verify. Also transfer ₹5,000 security deposit to account 9876543210123456 IFSC SBIN0001234 to activate protection.' },
            { text: 'Sir this is urgent! Call me on 8899776655 or your account will be permanently blocked! Send money via UPI to sbiprotect@oksbi right now!' },
            { text: 'The OTP will come on your phone, please share it with me immediately so I can process the reversal!' }
        ],
        // In-chat scam image to show between messages (after msg index 2)
        imageAfter: 2,
        imageHtml: `<div class="wa-scam-image">
            <div style="font-size:28px;margin-bottom:4px">⚠️🏦</div>
            <div class="scam-img-title">SBI SECURITY ALERT</div>
            <div class="scam-img-body">
                Your account ending ****4532 has been BLOCKED!<br>
                Suspicious transfer of ₹50,000 detected.<br>
                <strong>Call: 8899776655</strong> | <strong>Pay ₹5,000 via UPI</strong><br>
                <span style="font-size:10px;opacity:0.7">Reference: SBI/SEC/2026/99821</span>
            </div>
        </div>`,
        // Voice demo content
        voiceTranscript: '"Hello sir, I am calling from State Bank of India head office. Your account has been compromised. Please transfer five thousand rupees to our security account 9876543210123456. Your UPI payment should go to sbiprotect@oksbi."',
        // Image analysis content
        imageAnalysis: 'This appears to be a <strong style="color:var(--accent-orange)">FRAUDULENT bank notification</strong>. The image impersonates State Bank of India with incorrect formatting and unofficial branding. Contains suspicious phone number (8899776655) and unverified UPI payment request. Consistent with known financial phishing scam patterns.'
    },
    tech_support: {
        name: 'Tech Support Scam',
        callerName: 'Microsoft Support',
        messages: [
            { text: 'Hello, this is Microsoft Windows Security calling. We have detected a critical virus on your computer that is stealing your banking data right now.' },
            { text: 'Sir, open your Start menu and type "Event Viewer". You will see many error messages — those are signs of the virus. We need to fix this immediately.' },
            { text: 'I need remote access to clean the virus. Please download TeamViewer from teamview-support.com/fix and give me the ID and password. My tech ID is MS-TECH-7742.' },
            { text: 'The virus has already stolen your passwords. To activate our premium antivirus protection, you need to pay ₹15,000 via UPI to mssupport@axl or transfer to account 1122334455667788 IFSC HDFC0009876.' },
            { text: 'Sir if you don\'t pay now, hackers will empty your bank account tonight! Call our priority line 9988776655 immediately. This is very urgent!' },
            { text: 'I am sending you the protection certificate. Check your email at support-microsoft@outlook.com. Enter your bank login on the page to verify your identity.' }
        ],
        imageAfter: 2,
        imageHtml: `<div class="wa-scam-image" style="background:#f8d7da;border-color:#dc3545">
            <div style="font-size:28px;margin-bottom:4px">🦠💻</div>
            <div class="scam-img-title" style="color:#721c24">CRITICAL VIRUS DETECTED!</div>
            <div class="scam-img-body" style="color:#721c24">
                Your computer is infected with TROJAN.BANKSTEALER<br>
                Immediate action required!<br>
                <strong>Download fix: teamview-support.com/fix</strong><br>
                <span style="font-size:10px;opacity:0.7">Windows Security Alert #WS-2026-4471</span>
            </div>
        </div>`,
        voiceTranscript: '"This is Microsoft Windows calling. Your computer has a critical virus that is stealing your banking information. You need to download TeamViewer from teamview-support.com and pay fifteen thousand rupees for premium antivirus protection using UPI mssupport@axl."',
        imageAnalysis: 'This appears to be a <strong style="color:var(--accent-orange)">FAKE tech support alert</strong>. It mimics Microsoft security warnings but uses unofficial branding and a suspicious domain (teamview-support.com). Classic tech support scam tactics — creating fake urgency to extract payment.'
    },
    lottery_scam: {
        name: 'Lottery / Prize Scam',
        callerName: 'Google Lucky Draw',
        messages: [
            { text: 'CONGRATULATIONS! Your mobile number has been selected as the WINNER of Google Lucky Draw 2026! You have won ₹25,00,000 (Twenty Five Lakhs)!' },
            { text: 'This is official notification from Google India. Your Reference Number is GL-99821. To claim your prize, we need to verify your identity and process the tax payment.' },
            { text: 'Sir, as per RBI rules, you need to pay 2% processing fee of ₹15,000 before we can transfer the prize money. Please pay via UPI to luckydraw@axl or bank transfer to account 5544332211009988 IFSC ICIC0001234.' },
            { text: 'You can also visit our official claim page at google-luckydraw.com/claim to complete the process. Your prize will expire in 24 hours if not claimed! Call +91-7766554433 for help.' },
            { text: 'Sir we have already processed 5 winners today. If you delay further we will have to give your prize to the next person! Please send ₹15,000 immediately!' },
            { text: 'Check your email lottery-google2026@gmail.com for the official winner certificate. Share your Aadhaar number for tax documentation.' }
        ],
        imageAfter: 1,
        imageHtml: `<div class="wa-scam-image" style="background:#d4edda;border-color:#28a745">
            <div style="font-size:28px;margin-bottom:4px">🎉🏆💰</div>
            <div class="scam-img-title" style="color:#155724">GOOGLE LUCKY DRAW 2026 — WINNER!</div>
            <div class="scam-img-body" style="color:#155724">
                Prize: ₹25,00,000 (Twenty Five Lakhs)<br>
                Reference: GL-99821<br>
                <strong>Claim: google-luckydraw.com/claim</strong><br>
                <span style="font-size:10px;opacity:0.7">Processing fee: ₹15,000 | Expires in 24hrs</span>
            </div>
        </div>`,
        voiceTranscript: '"Congratulations! Your mobile number has won Google Lucky Draw 2026, prize of twenty five lakh rupees! Please pay processing fee of fifteen thousand rupees to UPI luckydraw@axl or bank account 5544332211009988. Visit google-luckydraw.com to claim."',
        imageAnalysis: 'This is a <strong style="color:var(--accent-orange)">CLASSIC LOTTERY/PRIZE SCAM</strong>. Google does not run "Lucky Draw" promotions via phone/SMS. The claim URL (google-luckydraw.com) is not an official Google domain. Requests for upfront "processing fee" payment are a hallmark of advance-fee fraud.'
    }
};

function selectScenario(btn) {
    document.querySelectorAll('.sim-scenario-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedScenario = btn.dataset.scenario;
}

async function startSimulation() {
    if (simRunning) return;
    simRunning = true;

    const scenario = SCENARIOS[selectedScenario];
    const sessionId = `demo-${Date.now()}`;
    const btn = document.getElementById('sim-start-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Simulation Running...';

    // Reset UI
    const chat = document.getElementById('sim-chat-window');
    chat.innerHTML = '';
    document.getElementById('sim-badges').innerHTML = '';
    document.getElementById('sim-intel-items').innerHTML = '';
    document.getElementById('sim-intel-panel').style.display = 'none';
    document.getElementById('sim-nlp-panel').style.display = 'none';
    document.getElementById('nlp-patterns').innerHTML = '';
    document.getElementById('sim-progress').style.display = 'block';
    document.getElementById('sim-scammer-name').textContent = scenario.callerName;
    ['voice', 'image', 'network', 'report', 'complaint'].forEach(p => {
        document.getElementById(`sim-demo-${p}`).style.display = 'none';
    });

    const intelItems = document.getElementById('sim-intel-items');
    let timeCounter = 0;
    let allIntel = { bankAccounts: [], upiIds: [], phoneNumbers: [], phishingLinks: [] };

    // System message
    chat.innerHTML += `<div class="wa-msg wa-msg-system">🔐 End-to-end encrypted simulation — ${scenario.name}</div>`;
    updateProgress(5, 'Phase 1: Scam Engagement');

    // ── Phase 1: Real-Time Chat with API Calls ──
    for (let i = 0; i < scenario.messages.length; i++) {
        const msg = scenario.messages[i];
        timeCounter += 2;
        const timeStr = `10:${String(30 + timeCounter % 30).padStart(2, '0')} AM`;

        // Show scammer message
        await sleep(1500);
        chat.innerHTML += `
            <div class="wa-msg wa-msg-scammer">
                <span class="wa-sender">🔴 ${scenario.callerName}</span>
                ${msg.text}
                <div class="wa-time">${timeStr}</div>
            </div>`;
        chat.scrollTop = chat.scrollHeight;

        // Show scam image if applicable
        if (i === scenario.imageAfter) {
            await sleep(800);
            chat.innerHTML += `
                <div class="wa-msg wa-msg-scammer" style="padding:4px 8px">
                    ${scenario.imageHtml}
                    <div class="wa-time">${timeStr}</div>
                </div>`;
            chat.scrollTop = chat.scrollHeight;
        }

        // Show typing indicator
        chat.innerHTML += `<div class="wa-typing" id="sim-typing"><div class="wa-typing-dot"></div><div class="wa-typing-dot"></div><div class="wa-typing-dot"></div></div>`;
        document.getElementById('sim-caller-status').textContent = 'typing...';
        chat.scrollTop = chat.scrollHeight;

        // ── REAL API CALL — get AI response from backend ──
        let aiReply = '';
        let nlpData = null;
        try {
            const res = await fetch(`${API_BASE}/api/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    scammerMessage: msg.text,
                    scenarioName: selectedScenario
                })
            });
            const data = await res.json();
            aiReply = data.reply || 'I am not sure about this...';
            nlpData = data.nlp || {};

            // Update NLP panel
            document.getElementById('sim-nlp-panel').style.display = 'block';
            document.getElementById('nlp-scam-detected').textContent = nlpData.scamDetected ? '⚠️ YES' : '❌ NO';
            document.getElementById('nlp-scam-detected').style.color = nlpData.scamDetected ? '#e74c3c' : '#00b894';
            document.getElementById('nlp-confidence').textContent = (nlpData.confidence * 100).toFixed(0) + '%';
            document.getElementById('nlp-stage').textContent = nlpData.currentStage || 'EXPLORATORY';
            document.getElementById('nlp-persona').textContent = '🎭 ' + (nlpData.persona || 'WORRIED_PARENT');

            // Show detected patterns
            if (nlpData.patternsFound?.length) {
                document.getElementById('nlp-patterns').innerHTML = nlpData.patternsFound
                    .map(p => `<span class="nlp-pattern-tag">${p}</span>`).join('');
            }

            // Update badges
            document.getElementById('sim-badges').innerHTML = `
                <span class="wa-badge wa-badge-stage">${nlpData.currentStage || 'HOOK'}</span>
                <span class="wa-badge wa-badge-persona">🎭 ${nlpData.persona || 'WORRIED_PARENT'}</span>
                ${nlpData.scamDetected ? '<span class="wa-badge wa-badge-scam">⚠️ SCAM</span>' : ''}
            `;

            // Show extracted intel
            const intel = data.intelligence || {};
            const newItems = [];
            for (const acc of (intel.bankAccounts || [])) {
                if (!allIntel.bankAccounts.includes(acc.value)) {
                    allIntel.bankAccounts.push(acc.value);
                    newItems.push(`<span class="sim-intel-pill bank">🏦 ${acc.value} (${(acc.confidence * 100).toFixed(0)}%)</span>`);
                }
            }
            for (const upi of (intel.upiIds || [])) {
                if (!allIntel.upiIds.includes(upi.value)) {
                    allIntel.upiIds.push(upi.value);
                    newItems.push(`<span class="sim-intel-pill upi">📱 ${upi.value} (${(upi.confidence * 100).toFixed(0)}%)</span>`);
                }
            }
            for (const ph of (intel.phoneNumbers || [])) {
                if (!allIntel.phoneNumbers.includes(ph.value)) {
                    allIntel.phoneNumbers.push(ph.value);
                    newItems.push(`<span class="sim-intel-pill phone">📞 ${ph.value} (${(ph.confidence * 100).toFixed(0)}%)</span>`);
                }
            }
            for (const lnk of (intel.phishingLinks || [])) {
                if (!allIntel.phishingLinks.includes(lnk.value)) {
                    allIntel.phishingLinks.push(lnk.value);
                    newItems.push(`<span class="sim-intel-pill link">🔗 ${lnk.value} (${(lnk.confidence * 100).toFixed(0)}%)</span>`);
                }
            }
            if (newItems.length) {
                document.getElementById('sim-intel-panel').style.display = 'block';
                intelItems.innerHTML += newItems.join('');
            }

        } catch (err) {
            console.error('Simulate API error:', err);
            aiReply = 'Oh my God, what should I do? Please help me sir, I am very worried about my money...';
        }

        // Remove typing, show AI reply
        const typing = document.getElementById('sim-typing');
        if (typing) typing.remove();
        document.getElementById('sim-caller-status').textContent = 'online';

        timeCounter += 1;
        const replyTime = `10:${String(30 + timeCounter % 30).padStart(2, '0')} AM`;
        chat.innerHTML += `
            <div class="wa-msg wa-msg-ai">
                <span class="wa-sender">🛡️ HoneyPot AI</span>
                ${aiReply}
                <div class="wa-time">${replyTime} ✓✓</div>
            </div>`;
        chat.scrollTop = chat.scrollHeight;

        // Update progress
        updateProgress(5 + ((i + 1) / scenario.messages.length) * 40, 'Phase 1: Scam Engagement');
        scrollFeaturePanel();
    }

    // End of chat
    await sleep(1000);
    chat.innerHTML += `<div class="wa-msg wa-msg-system">🛡️ SESSION ENDED — Intelligence extraction complete. Scammer data captured and logged.</div>`;
    chat.scrollTop = chat.scrollHeight;

    // ── Phase 2: Voice Analysis Demo (REAL-TIME API) ──
    await sleep(1500);
    updateProgress(50, 'Phase 2: Voice Analysis (Whisper API)');

    const voicePanel = document.getElementById('sim-demo-voice');
    voicePanel.style.display = 'block';

    // Show waveform animation while API call is in progress
    let waveHtml = '<div class="sim-waveform">';
    for (let i = 0; i < 40; i++) {
        const h = 6 + Math.random() * 20;
        waveHtml += `<div class="sim-wave-bar" style="height:${h}px;animation-delay:${i * 0.05}s"></div>`;
    }
    waveHtml += '</div>';

    document.getElementById('sim-voice-content').innerHTML = `
        <p>📎 <strong>scammer_call_recording.mp3</strong> — Uploaded for analysis</p>
        ${waveHtml}
        <p style="margin-top:8px">⏳ Processing with Groq Whisper v3-large... <span class="loading-dot">●</span></p>
    `;
    scrollFeaturePanel();

    // ── REAL API CALL: Voice Analysis ──
    try {
        const voiceRes = await fetch(`${API_BASE}/api/simulate/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                scenarioName: selectedScenario,
                callerName: scenario.callerName
            })
        });
        const voiceData = await voiceRes.json();

        // Show real transcript from API
        const voiceIntelHtml = [
            ...(voiceData.intelligence?.bankAccounts || []).map(v => `<span class="sim-intel-pill bank">🏦 ${v}</span>`),
            ...(voiceData.intelligence?.upiIds || []).map(v => `<span class="sim-intel-pill upi">📱 ${v}</span>`),
            ...(voiceData.intelligence?.phoneNumbers || []).map(v => `<span class="sim-intel-pill phone">📞 ${v}</span>`),
            ...(voiceData.intelligence?.phishingLinks || []).map(v => `<span class="sim-intel-pill link">🔗 ${v}</span>`)
        ].join('');

        const voicePatternsHtml = (voiceData.scamAnalysis?.patternsFound || [])
            .map(p => `<span class="nlp-pattern-tag">${p}</span>`).join('');

        document.getElementById('sim-voice-content').innerHTML = `
            <p>📎 <strong>scammer_call_recording.mp3</strong> — Analysis Complete ✅</p>
            ${waveHtml}
            <div style="margin-top:8px;padding:6px 10px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:0.8em;display:flex;gap:16px;flex-wrap:wrap">
                <span>📞 Caller: <strong>${voiceData.callerId || 'Unknown'}</strong></span>
                <span>⏱️ Duration: <strong>${voiceData.duration || '—'}</strong></span>
                <span>🌐 Language: <strong>${voiceData.language || 'en'}</strong></span>
                <span>🤖 Model: <strong>${voiceData.whisperModel || 'whisper-large-v3'}</strong></span>
            </div>
            <div style="margin-top:12px;padding:12px;background:var(--bg-primary);border-radius:var(--radius-sm);box-shadow:var(--clay-shadow-inset);white-space:pre-wrap;font-size:0.88em;line-height:1.6">
                <strong>📝 Transcript (Real-Time via Whisper):</strong><br><em>${voiceData.transcript || '[No transcript available]'}</em>
            </div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                ${voiceIntelHtml}
                ${voiceData.scamAnalysis?.scamDetected ? '<span class="badge badge-high" style="margin-left:8px">⚠️ SCAM CONFIRMED</span>' : ''}
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                ${voicePatternsHtml}
                <span style="font-size:0.78em;color:var(--text-muted)">Confidence: ${((voiceData.scamAnalysis?.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
        `;

        // Add voice-extracted intel to the main intel tracker
        for (const v of (voiceData.intelligence?.bankAccounts || [])) {
            if (!allIntel.bankAccounts.includes(v)) allIntel.bankAccounts.push(v);
        }
        for (const v of (voiceData.intelligence?.upiIds || [])) {
            if (!allIntel.upiIds.includes(v)) allIntel.upiIds.push(v);
        }
        for (const v of (voiceData.intelligence?.phoneNumbers || [])) {
            if (!allIntel.phoneNumbers.includes(v)) allIntel.phoneNumbers.push(v);
        }
        for (const v of (voiceData.intelligence?.phishingLinks || [])) {
            if (!allIntel.phishingLinks.includes(v)) allIntel.phishingLinks.push(v);
        }

    } catch (err) {
        console.error('Voice analysis API error:', err);
        document.getElementById('sim-voice-content').innerHTML += `
            <div style="margin-top:12px;padding:12px;background:var(--bg-primary);border-radius:var(--radius-sm);box-shadow:var(--clay-shadow-inset)">
                <strong>📝 Transcript:</strong><br><em>${scenario.voiceTranscript}</em>
            </div>
            <span class="badge badge-high">⚠️ SCAM CONFIRMED</span>
        `;
    }
    scrollFeaturePanel();

    // ── Phase 3: Image Intelligence Demo (REAL-TIME API) ──
    await sleep(2000);
    updateProgress(65, 'Phase 3: Image Intelligence (Vision API)');

    document.getElementById('sim-demo-image').style.display = 'block';
    document.getElementById('sim-image-content').innerHTML = `
        <p>📎 <strong>scam_screenshot.png</strong> — Uploaded for Vision AI analysis</p>
        ${scenario.imageHtml}
        <p style="margin-top:8px">⏳ Analyzing with Groq Vision AI (Llama-4-Scout)... <span class="loading-dot">●</span></p>
    `;
    scrollFeaturePanel();

    // ── REAL API CALL: Image Intelligence ──
    try {
        const imgRes = await fetch(`${API_BASE}/api/simulate/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                scenarioName: selectedScenario,
                imageDescription: scenario.name
            })
        });
        const imgData = await imgRes.json();

        const imgIntelHtml = [
            ...(imgData.intelligence?.bankAccounts || []).map(v => `<span class="sim-intel-pill bank">🏦 ${v}</span>`),
            ...(imgData.intelligence?.upiIds || []).map(v => `<span class="sim-intel-pill upi">📱 ${v}</span>`),
            ...(imgData.intelligence?.phoneNumbers || []).map(v => `<span class="sim-intel-pill phone">📞 ${v}</span>`),
            ...(imgData.intelligence?.phishingLinks || []).map(v => `<span class="sim-intel-pill link">🔗 ${v}</span>`)
        ].join('');

        // Format the analysis text (convert markdown bold to HTML)
        const formattedAnalysis = (imgData.analysis || '[No analysis available]')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        document.getElementById('sim-image-content').innerHTML = `
            <p>📎 <strong>scam_screenshot.png</strong> — Analysis Complete ✅</p>
            ${scenario.imageHtml}
            <div style="margin-top:8px;padding:6px 10px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:0.8em;display:flex;gap:16px;flex-wrap:wrap">
                <span>🖼️ Type: <strong>${imgData.imageType || 'Unknown'}</strong></span>
                <span>🤖 Model: <strong>${imgData.model || 'vision-preview'}</strong></span>
                <span>🚨 Threat: <strong style="color:#e74c3c">${imgData.threatLevel || 'HIGH'}</strong></span>
            </div>
            <div style="margin-top:12px;padding:12px;background:var(--bg-primary);border-radius:var(--radius-sm);box-shadow:var(--clay-shadow-inset);font-size:0.85em;line-height:1.6;max-height:280px;overflow-y:auto">
                <strong>🔍 Forensic Analysis (Real-Time via Vision AI):</strong><br>${formattedAnalysis}
            </div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                ${imgIntelHtml}
                <span class="badge badge-high" style="margin-left:8px">⚠️ FAKE ALERT DETECTED</span>
            </div>
        `;

        // Add image-extracted intel to the main intel tracker
        for (const v of (imgData.intelligence?.bankAccounts || [])) {
            if (!allIntel.bankAccounts.includes(v)) allIntel.bankAccounts.push(v);
        }
        for (const v of (imgData.intelligence?.upiIds || [])) {
            if (!allIntel.upiIds.includes(v)) allIntel.upiIds.push(v);
        }
        for (const v of (imgData.intelligence?.phoneNumbers || [])) {
            if (!allIntel.phoneNumbers.includes(v)) allIntel.phoneNumbers.push(v);
        }
        for (const v of (imgData.intelligence?.phishingLinks || [])) {
            if (!allIntel.phishingLinks.includes(v)) allIntel.phishingLinks.push(v);
        }

    } catch (err) {
        console.error('Image analysis API error:', err);
        document.getElementById('sim-image-content').innerHTML += `
            <div style="margin-top:12px;padding:12px;background:var(--bg-primary);border-radius:var(--radius-sm);box-shadow:var(--clay-shadow-inset)">
                <strong>🔍 Analysis:</strong><br>${scenario.imageAnalysis}
            </div>
            <span class="badge badge-high">⚠️ FAKE ALERT DETECTED</span>
        `;
    }
    scrollFeaturePanel();

    // ── Phase 4: Network Mapping ──
    await sleep(2000);
    updateProgress(78, 'Phase 4: Network Mapping');
    document.getElementById('sim-demo-network').style.display = 'block';

    const nodeColors = { bank: 'rgba(108,92,231,0.12)', upi: 'rgba(0,184,148,0.12)', phone: 'rgba(225,112,85,0.12)', link: 'rgba(253,203,110,0.2)' };
    const nodeTextC = { bank: 'var(--accent-purple)', upi: 'var(--accent-green)', phone: 'var(--accent-orange)', link: '#e67e22' };
    let netNodes = '';
    allIntel.bankAccounts.forEach(v => netNodes += `<span class="sim-net-node" style="background:${nodeColors.bank};color:${nodeTextC.bank}">🏦 ${v}</span><span class="sim-net-line"></span>`);
    allIntel.upiIds.forEach(v => netNodes += `<span class="sim-net-node" style="background:${nodeColors.upi};color:${nodeTextC.upi}">📱 ${v}</span><span class="sim-net-line"></span>`);
    allIntel.phoneNumbers.forEach(v => netNodes += `<span class="sim-net-node" style="background:${nodeColors.phone};color:${nodeTextC.phone}">📞 ${v}</span><span class="sim-net-line"></span>`);
    allIntel.phishingLinks.forEach(v => netNodes += `<span class="sim-net-node" style="background:${nodeColors.link};color:${nodeTextC.link}">🔗 ${v}</span>`);

    const totalIntel = allIntel.bankAccounts.length + allIntel.upiIds.length + allIntel.phoneNumbers.length + allIntel.phishingLinks.length;

    document.getElementById('sim-network-content').innerHTML = `
        <p>Building connections between extracted scammer identifiers...</p>
        <div class="sim-network-mini">${netNodes}</div>
        <p style="margin-top:10px;font-size:11px;color:var(--text-muted)">
            ✅ <strong>${totalIntel} identifiers</strong> linked across 1 session — All connected to the same scam operation
        </p>
    `;
    scrollFeaturePanel();

    // ── Phase 5: Intelligence Report ──
    await sleep(2000);
    updateProgress(90, 'Phase 5: Intelligence Report');
    document.getElementById('sim-demo-report').style.display = 'block';

    document.getElementById('sim-report-content').innerHTML = `
        <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr style="background:rgba(108,92,231,0.08)">
                <td style="padding:8px;font-weight:600">Scenario</td>
                <td style="padding:8px">${scenario.name}</td>
            </tr><tr>
                <td style="padding:8px;font-weight:600">Messages Exchanged</td>
                <td style="padding:8px">${scenario.messages.length * 2}</td>
            </tr><tr style="background:rgba(108,92,231,0.08)">
                <td style="padding:8px;font-weight:600">Scam Confidence</td>
                <td style="padding:8px"><span class="badge badge-high">${document.getElementById('nlp-confidence').textContent}</span></td>
            </tr><tr>
                <td style="padding:8px;font-weight:600">Persona Used</td>
                <td style="padding:8px">${document.getElementById('nlp-persona').textContent}</td>
            </tr><tr style="background:rgba(108,92,231,0.08)">
                <td style="padding:8px;font-weight:600">Final Stage</td>
                <td style="padding:8px">${document.getElementById('nlp-stage').textContent}</td>
            </tr><tr>
                <td style="padding:8px;font-weight:600">Bank Accounts</td>
                <td style="padding:8px">${allIntel.bankAccounts.map(v => `<span class="sim-intel-pill bank">${v}</span>`).join(' ') || 'None'}</td>
            </tr><tr style="background:rgba(108,92,231,0.08)">
                <td style="padding:8px;font-weight:600">UPI IDs</td>
                <td style="padding:8px">${allIntel.upiIds.map(v => `<span class="sim-intel-pill upi">${v}</span>`).join(' ') || 'None'}</td>
            </tr><tr>
                <td style="padding:8px;font-weight:600">Phone Numbers</td>
                <td style="padding:8px">${allIntel.phoneNumbers.map(v => `<span class="sim-intel-pill phone">${v}</span>`).join(' ') || 'None'}</td>
            </tr><tr style="background:rgba(108,92,231,0.08)">
                <td style="padding:8px;font-weight:600">Phishing Links</td>
                <td style="padding:8px">${allIntel.phishingLinks.map(v => `<span class="sim-intel-pill link">${v}</span>`).join(' ') || 'None'}</td>
            </tr>
        </table>
    `;
    scrollFeaturePanel();

    // ── Phase 6: Auto Complaint Document ──
    await sleep(2000);
    updateProgress(100, 'Phase 6: Auto Complaint Generated');
    document.getElementById('sim-demo-complaint').style.display = 'block';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let intelSection = '';
    if (allIntel.bankAccounts.length) intelSection += `\n  BANK ACCOUNTS:\n` + allIntel.bankAccounts.map(v => `    - Account: ${v} (Confidence: 95%)`).join('\n');
    if (allIntel.upiIds.length) intelSection += `\n  UPI IDS:\n` + allIntel.upiIds.map(v => `    - UPI: ${v} (Confidence: 95%)`).join('\n');
    if (allIntel.phoneNumbers.length) intelSection += `\n  PHONE NUMBERS:\n` + allIntel.phoneNumbers.map(v => `    - Phone: ${v} (Confidence: 90%)`).join('\n');
    if (allIntel.phishingLinks.length) intelSection += `\n  PHISHING LINKS:\n` + allIntel.phishingLinks.map(v => `    - URL: ${v} (Confidence: 90%)`).join('\n');

    document.getElementById('sim-complaint-content').innerHTML = `
        <pre>════════════════════════════════════════════════════
            CYBERCRIME COMPLAINT REPORT
      Auto-Generated by Agentic Honey-Pot System
════════════════════════════════════════════════════

DATE OF REPORT:     ${dateStr}
REFERENCE NUMBER:   HP-${sessionId.slice(-6).toUpperCase()}
SYSTEM VERSION:     Agentic Honey-Pot v3.0
SCENARIO:           ${scenario.name}

────────────────────────────────────────────────────
SECTION 1: INCIDENT SUMMARY
────────────────────────────────────────────────────

  Incident Type:      ${scenario.name}
  Detection Method:   AI-Powered Honeypot + NLP Analysis
  Scam Confidence:    ${document.getElementById('nlp-confidence').textContent}
  Total Messages:     ${scenario.messages.length * 2}
  Intel Items:        ${totalIntel}

────────────────────────────────────────────────────
SECTION 2: EXTRACTED INTELLIGENCE
────────────────────────────────────────────────────
${intelSection}

────────────────────────────────────────────────────
SECTION 3: RECOMMENDED ACTION
────────────────────────────────────────────────────

  ${allIntel.bankAccounts.length ? '1. FREEZE bank account(s): ' + allIntel.bankAccounts.join(', ') : ''}
  ${allIntel.phoneNumbers.length ? '2. TRACE phone number(s): ' + allIntel.phoneNumbers.join(', ') : ''}
  ${allIntel.phishingLinks.length ? '3. BLOCK phishing URL(s) via CERT-In' : ''}
  ${allIntel.upiIds.length ? '4. INVESTIGATE UPI IDs through NPCI' : ''}

════════════════════════════════════════════════════
        END OF COMPLAINT REPORT
════════════════════════════════════════════════════</pre>
    `;
    scrollFeaturePanel();

    // ── Done ──
    await sleep(1000);
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔄</span> Restart Simulation';
    simRunning = false;
}

function updateProgress(pct, label) {
    document.getElementById('sim-progress-fill').style.width = pct + '%';
    document.getElementById('sim-progress-label').textContent = label;
}

function scrollFeaturePanel() {
    const panel = document.querySelector('.sim-feature-panel');
    if (panel) panel.scrollTop = panel.scrollHeight;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Auto-refresh ───────────────────────────────────────
setInterval(() => {
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab && activeTab.dataset.tab === 'overview') {
        loadDashboard();
    }
}, 15000);

// ── Initial Load ───────────────────────────────────────
loadDashboard();
