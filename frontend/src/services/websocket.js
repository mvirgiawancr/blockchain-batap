const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.userId = null;
    this.shouldReconnect = true;      // false saat disconnect() disengaja
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 30;   // proses upload bisa makan menit → jangan cepat menyerah
    this.baseReconnectDelay = 2000;
    this.maxReconnectDelay = 15000;
    this.pingTimer = null;
  }

  connect(userId = null) {
    this.userId = userId;
    this.shouldReconnect = true;

    // Hindari koneksi ganda (mencegah socket storm & desync).
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = userId ? `${WS_URL}?user_id=${userId}` : WS_URL;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      const reconnected = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      this.startKeepAlive();
      this.emit('connected', { status: 'connected', reconnected });
      // Setelah RECONNECT, pesan selama gap mungkin hilang → minta halaman refetch state.
      if (reconnected) this.emit('reconnected', { status: 'reconnected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.type || data.event;
        if (messageType === 'pong' || messageType === 'heartbeat') return; // keep-alive, abaikan
        if (messageType) {
          this.emit(messageType, data);
          this.emit('message', data);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopKeepAlive();
      this.emit('disconnected', { status: 'disconnected' });
      if (this.shouldReconnect) this.attemptReconnect();
    };
  }

  startKeepAlive() {
    this.stopKeepAlive();
    // Kirim ping aplikasi tiap 25s agar proxy tidak menutup koneksi idle.
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  stopKeepAlive() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  attemptReconnect() {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
      console.log(`Reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) dalam ${Math.round(delay / 1000)}s`);
      setTimeout(() => this.connect(this.userId), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    this.shouldReconnect = false; // cegah onclose memicu reconnect
    this.stopKeepAlive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }
}

const wsService = new WebSocketService();
export default wsService;
