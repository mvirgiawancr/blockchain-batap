const ws = require('./websocket');

// WebSocket.OPEN === 1
function fakeWs() {
  return { readyState: 1, sent: [], send(m) { this.sent.push(m); } };
}

describe('websocket client registry', () => {
  beforeEach(() => ws._clients.clear());

  test('sendToClient mengirim ke semua koneksi milik satu user', () => {
    const a = fakeWs(), b = fakeWs();
    ws._addClient('u1', a);
    ws._addClient('u1', b);
    expect(ws.sendToClient('u1', { type: 'x' })).toBe(true);
    expect(a.sent.length).toBe(1);
    expect(b.sent.length).toBe(1);
  });

  // RC2: menutup koneksi LAMA tidak boleh menghapus koneksi BARU (race reconnect).
  test('menutup satu koneksi tidak menghapus koneksi lain', () => {
    const oldWs = fakeWs(), newWs = fakeWs();
    ws._addClient('u1', oldWs);
    ws._addClient('u1', newWs);
    ws._removeClient('u1', oldWs); // koneksi lama close DULUAN
    expect(ws.sendToClient('u1', { type: 'x' })).toBe(true);
    expect(newWs.sent.length).toBe(1); // koneksi baru tetap menerima
  });

  test('sendToClient false bila user tidak punya koneksi', () => {
    expect(ws.sendToClient('nobody', { type: 'x' })).toBe(false);
  });

  test('koneksi yang tidak OPEN dilewati', () => {
    const dead = fakeWs(); dead.readyState = 3; // CLOSED
    ws._addClient('u1', dead);
    expect(ws.sendToClient('u1', { type: 'x' })).toBe(false);
    expect(dead.sent.length).toBe(0);
  });
});
