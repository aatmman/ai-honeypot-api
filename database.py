"""
Scammer Intelligence Database — SQLite Backend
Stores caught scammers, sessions, extracted intelligence, and network connections.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

DB_PATH = os.environ.get("DB_PATH", "honeypot_intel.db")

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            persona TEXT DEFAULT 'WORRIED_PARENT',
            final_stage TEXT DEFAULT 'HOOK',
            message_count INTEGER DEFAULT 0,
            scam_detected BOOLEAN DEFAULT 0,
            scam_confidence REAL DEFAULT 0.0,
            scam_type TEXT DEFAULT '',
            status TEXT DEFAULT 'active'
        )
    """)
    
    # Messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            sender TEXT,
            message_text TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)
    
    # Extracted intelligence table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS intelligence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            intel_type TEXT,
            value TEXT,
            confidence REAL DEFAULT 0.0,
            extraction_method TEXT DEFAULT 'regex',
            extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)
    
    # Scammer profiles (aggregated across sessions)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scammers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT UNIQUE,
            identifier_type TEXT,
            first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            session_count INTEGER DEFAULT 1,
            threat_level TEXT DEFAULT 'medium',
            notes TEXT DEFAULT ''
        )
    """)
    
    # Network connections (links between scammer identifiers)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS network_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_identifier TEXT,
            target_identifier TEXT,
            link_type TEXT DEFAULT 'same_session',
            session_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source_identifier, target_identifier, session_id)
        )
    """)
    
    conn.commit()
    conn.close()
    print("🗄️ Database initialized successfully")


# ─── Session Operations ───────────────────────────────────────

def save_session(session_id: str, session_data: Dict[str, Any]):
    """Save or update session in database"""
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO sessions (session_id, persona, final_stage, message_count, scam_detected, scam_confidence, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                persona = excluded.persona,
                final_stage = excluded.final_stage,
                message_count = excluded.message_count,
                scam_detected = excluded.scam_detected,
                scam_confidence = excluded.scam_confidence,
                status = excluded.status
        """, (
            session_id,
            session_data.get('persona', 'WORRIED_PARENT'),
            session_data.get('current_stage', 'HOOK'),
            session_data.get('message_count', 0),
            1 if session_data.get('scam_detected', False) else 0,
            session_data.get('scam_confidence', 0.0),
            'active'
        ))
        conn.commit()
    finally:
        conn.close()

def end_session(session_id: str, session_data: Dict[str, Any]):
    """Mark session as ended and save final state"""
    conn = get_db()
    try:
        conn.execute("""
            UPDATE sessions SET
                ended_at = CURRENT_TIMESTAMP,
                persona = ?,
                final_stage = ?,
                message_count = ?,
                scam_detected = ?,
                scam_confidence = ?,
                status = 'completed'
            WHERE session_id = ?
        """, (
            session_data.get('persona', 'WORRIED_PARENT'),
            session_data.get('current_stage', 'HOOK'),
            session_data.get('message_count', 0),
            1 if session_data.get('scam_detected', False) else 0,
            session_data.get('scam_confidence', 0.0),
            session_id
        ))
        conn.commit()
    finally:
        conn.close()

def save_message(session_id: str, sender: str, text: str):
    """Save a message to the database"""
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO messages (session_id, sender, message_text) VALUES (?, ?, ?)",
            (session_id, sender, text)
        )
        conn.commit()
    finally:
        conn.close()


# ─── Intelligence Operations ──────────────────────────────────

def save_intelligence(session_id: str, intel_type: str, value: str, confidence: float = 0.0, method: str = "regex"):
    """Save extracted intelligence and update scammer profiles"""
    conn = get_db()
    try:
        # Save intel item
        conn.execute(
            "INSERT OR IGNORE INTO intelligence (session_id, intel_type, value, confidence, extraction_method) VALUES (?, ?, ?, ?, ?)",
            (session_id, intel_type, value, confidence, method)
        )
        
        # Update or create scammer profile
        conn.execute("""
            INSERT INTO scammers (identifier, identifier_type, first_seen, last_seen, session_count)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
            ON CONFLICT(identifier) DO UPDATE SET
                last_seen = CURRENT_TIMESTAMP,
                session_count = session_count + 1
        """, (value, intel_type))
        
        conn.commit()
    finally:
        conn.close()

def check_known_scammer(value: str) -> Optional[Dict]:
    """Check if an identifier is in the scammer database"""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM scammers WHERE identifier = ?", (value,)
        ).fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


# ─── Network Mapping ──────────────────────────────────────────

def build_network_links(session_id: str, intel_items: List[Dict]):
    """Create network links between all intelligence items in a session"""
    conn = get_db()
    try:
        identifiers = [item['value'] for item in intel_items]
        for i in range(len(identifiers)):
            for j in range(i + 1, len(identifiers)):
                conn.execute("""
                    INSERT OR IGNORE INTO network_links (source_identifier, target_identifier, link_type, session_id)
                    VALUES (?, ?, 'same_session', ?)
                """, (identifiers[i], identifiers[j], session_id))
        conn.commit()
    finally:
        conn.close()

def get_network_data() -> Dict:
    """Get network graph data for visualization"""
    conn = get_db()
    try:
        # Get all scammer nodes
        nodes = []
        rows = conn.execute("SELECT identifier, identifier_type, session_count, threat_level FROM scammers").fetchall()
        for row in rows:
            nodes.append({
                "id": row['identifier'],
                "type": row['identifier_type'],
                "sessions": row['session_count'],
                "threat": row['threat_level']
            })
        
        # Get all links
        links = []
        rows = conn.execute("SELECT DISTINCT source_identifier, target_identifier, link_type FROM network_links").fetchall()
        for row in rows:
            links.append({
                "source": row['source_identifier'],
                "target": row['target_identifier'],
                "type": row['link_type']
            })
        
        return {"nodes": nodes, "links": links}
    finally:
        conn.close()


# ─── Dashboard Queries ─────────────────────────────────────────

def get_dashboard_stats() -> Dict:
    """Get overview statistics for dashboard"""
    conn = get_db()
    try:
        total_sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        active_sessions = conn.execute("SELECT COUNT(*) FROM sessions WHERE status = 'active'").fetchone()[0]
        total_scammers = conn.execute("SELECT COUNT(*) FROM scammers").fetchone()[0]
        total_intel = conn.execute("SELECT COUNT(*) FROM intelligence").fetchone()[0]
        total_messages = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        
        # Intel breakdown
        banks = conn.execute("SELECT COUNT(*) FROM intelligence WHERE intel_type = 'bank_account'").fetchone()[0]
        upis = conn.execute("SELECT COUNT(*) FROM intelligence WHERE intel_type = 'upi_id'").fetchone()[0]
        phones = conn.execute("SELECT COUNT(*) FROM intelligence WHERE intel_type = 'phone'").fetchone()[0]
        links = conn.execute("SELECT COUNT(*) FROM intelligence WHERE intel_type = 'link'").fetchone()[0]
        
        # Recent sessions
        recent = conn.execute("""
            SELECT session_id, persona, final_stage, message_count, scam_confidence, started_at, status
            FROM sessions ORDER BY started_at DESC LIMIT 10
        """).fetchall()
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "total_scammers": total_scammers,
            "total_intel": total_intel,
            "total_messages": total_messages,
            "intel_breakdown": {
                "banks": banks,
                "upis": upis,
                "phones": phones,
                "links": links
            },
            "recent_sessions": [dict(r) for r in recent]
        }
    finally:
        conn.close()

def get_all_scammers() -> List[Dict]:
    """Get all scammer profiles"""
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT s.*, GROUP_CONCAT(DISTINCT i.session_id) as sessions
            FROM scammers s
            LEFT JOIN intelligence i ON s.identifier = i.value
            GROUP BY s.identifier
            ORDER BY s.last_seen DESC
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def get_session_detail(session_id: str) -> Dict:
    """Get full session detail including messages and intelligence"""
    conn = get_db()
    try:
        session = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not session:
            return {}
        
        messages = conn.execute(
            "SELECT sender, message_text, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp",
            (session_id,)
        ).fetchall()
        
        intel = conn.execute(
            "SELECT intel_type, value, confidence, extraction_method FROM intelligence WHERE session_id = ?",
            (session_id,)
        ).fetchall()
        
        return {
            "session": dict(session),
            "messages": [dict(m) for m in messages],
            "intelligence": [dict(i) for i in intel]
        }
    finally:
        conn.close()


# Initialize on import
init_db()
