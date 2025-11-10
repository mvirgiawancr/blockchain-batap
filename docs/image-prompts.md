# 📊 Prompts Text-to-Image untuk Dokumentasi Sistem

Gunakan prompts berikut untuk generate diagram menggunakan AI image generator (DALL-E, Midjourney, Stable Diffusion, dll)

---

## 🎨 CANVA DESIGN TEMPLATES (Untuk PowerPoint/PPTX Export)

### 📋 Cara Menggunakan Canva untuk Membuat Diagram PPTX:

**Langkah-langkah:**
1. Buka Canva → Pilih **"Presentation (16:9)"** atau **"Infographic"**
2. Search template: **"System Architecture"**, **"Flowchart"**, **"UML Diagram"**, atau **"Technical Diagram"**
3. Gunakan panduan di bawah untuk setiap slide/diagram
4. Edit dengan elemen Canva (shapes, icons, arrows, text)
5. Export → **Download as PowerPoint (.pptx)**

---

### 📊 SLIDE 1: Cover - Dokumentasi Sistem Akreditasi

**Canva Template:** "Professional Presentation Cover" atau "Tech Presentation Title"

**Design Elements:**
- **Title:** SISTEM AKREDITASI TERDESENTRALISASI
- **Subtitle:** Blockchain-based Accreditation Management System with AI
- **Sub-subtitle:** LAM-TEK 2025 - 7 Kriteria Akreditasi
- **Background:** Gradient blue (#3498db to #2c3e50) atau clean white
- **Icons:** Blockchain icon, AI icon, Document icon (tersebar background)
- **Footer:** Nama tim / Universitas / Tanggal

**Canva Search Keywords:**
- "blockchain presentation cover"
- "tech system presentation title"
- "professional blue presentation cover"

---

### 📊 SLIDE 2: Arsitektur Sistem (Gambar 2.1)

**Canva Template:** "System Architecture Diagram" atau "Flowchart Infographic"

**Design Elements untuk 8 Komponen:**

**Layout:** 3-tier vertical (Top → Middle → Bottom)

**Tier 1 (Top) - User Interface:**
- 📱 **React + Vite** (Blue card/box)
  - Icon: Browser/Monitor
  - Text: "Antarmuka pengguna UPPS & Sekretariat"

**Tier 2 (Middle) - Application:**
- 🖥️ **Express.js + Node.js** (Green card/box)
  - Icon: Server
  - Text: "Layer API dan orkestrasi layanan"

**Tier 3 (Bottom) - Infrastructure (2 rows, 3 boxes each):**

Row 1:
- 🔗 **Hyperledger Fabric 2.5.12** (Orange)
  - Icon: Blockchain/Chain
  - Text: "Ledger immutable untuk metadata"
  
- 💻 **TypeScript Chaincode** (Gray)
  - Icon: Code/Terminal
  - Text: "Logika bisnis akreditasi"
  
- ☁️ **IPFS (Pinata)** (Teal)
  - Icon: Cloud/Storage
  - Text: "Penyimpanan file terdesentralisasi"

Row 2:
- 🤖 **Google Gemini 1.5 Flash** (Purple)
  - Icon: AI/Brain
  - Text: "Analisis dokumen LED/LKPS"
  
- 🗄️ **CouchDB** (Dark Gray)
  - Icon: Database
  - Text: "World state database Fabric"
  
- 🔔 **WebSocket** (Red)
  - Icon: Notification/Bell
  - Text: "Notifikasi event-driven"

**Arrows:**
- React → Express (bidirectional, blue arrow)
- Express → All 6 bottom components (arrows going down)

**Canva Elements:**
- Search "rounded rectangle" untuk boxes
- Search "arrow" untuk connections
- Search icons: "browser", "server", "blockchain", "code", "cloud", "ai", "database", "notification"
- Use consistent spacing (align tools)

**Canva Search Keywords:**
- "system architecture template"
- "technology stack diagram"
- "layered architecture infographic"

---

### 📊 SLIDE 3: Use Case Diagram (Gambar 3.1)

**Canva Template:** "UML Use Case Diagram" atau "Process Flow Chart"

**Design Elements:**

**System Boundary:**
- Large rounded rectangle (light blue fill)
- Title: "Sistem Akreditasi Blockchain LAM-TEK 2025"

**Actors (Left & Right):**
- 👤 **UPPS** (stick figure icon, left side)
- 👨‍💼 **Sekretariat** (stick figure icon, right side)
- 🤖 **AI System (Gemini)** (robot icon, right side)

**Use Cases (Ovals inside boundary):**
- 📤 "Upload LED/LKPS Documents"
- 👀 "View Submissions"
- 🔍 "Analyze Document Completeness"
- 📋 "Review Submission Details"
- ✅ "Approve/Reject Submission"
- 📊 "View Scoring Results"
- 🔔 "Receive Real-time Notifications"

**Connections (Lines):**
- UPPS → Upload, View Submissions, View Scoring, Receive Notifications
- Sekretariat → View Submissions, Review Details, Approve/Reject, Receive Notifications
- AI System → Analyze Document
- Dashed line: Upload <<include>> Analyze Document

**Canva Search Keywords:**
- "use case diagram template"
- "UML diagram"
- "process flow diagram blue"

---

### 📊 SLIDE 4: Sequence Diagram - Upload (Gambar 4.1)

**Canva Template:** "Sequence Diagram" atau "Timeline Process"

**Design Elements:**

**Vertical Lifelines (8 columns):**
1. 👤 UPPS (stick figure)
2. 🌐 Frontend React (browser box)
3. 🖥️ Backend API (server box)
4. ☁️ Pinata Service (cloud box)
5. 📦 IPFS (network box)
6. 🤖 Gemini AI (AI box)
7. 🔗 Fabric Service (blockchain box)
8. 📒 Blockchain (ledger box)

**Dashed lines:** Vertical lines below each box (lifeline)

**Activation boxes:** Small rectangles on lifeline when processing

**Horizontal Arrows (numbered 1-13):**
1. UPPS → Frontend: "Fill form & select files"
2. Frontend → Backend: "POST /upload (LED, LKPS)"
3. Backend → Pinata: "Upload files"
4. Pinata → IPFS: "Store files"
5. IPFS → Pinata: "Return CID & hash" (dashed)
6. Pinata → Backend: "File metadata" (dashed)
7. Backend → Gemini: "Analyze documents"
8. Gemini → Backend: "Analysis results" (dashed)
9. Backend → Fabric: "Create submission"
10. Fabric → Blockchain: "Store metadata"
11. Blockchain → Fabric: "Transaction ID" (dashed)
12. Backend → Frontend: "Submission created" (dashed)
13. Frontend → UPPS: "Show results" (dashed)

**Arrow colors:**
- Solid blue: Requests
- Dashed green: Responses

**Canva Search Keywords:**
- "sequence diagram template"
- "timeline diagram horizontal"
- "process flow with arrows"

---

### 📊 SLIDE 5: Sequence Diagram - Verifikasi (Gambar 4.2)

**Canva Template:** Same as Slide 4

**Vertical Lifelines (7 columns):**
1. 👨‍💼 Sekretariat
2. 🌐 Frontend React
3. 🖥️ Backend API
4. 🔗 Fabric Service
5. 📒 Blockchain
6. 🔔 WebSocket Service
7. 👤 UPPS

**Horizontal Arrows (numbered 1-19):**
1. Sekretariat → Frontend: "View submissions list"
2. Frontend → Backend: "GET /submissions"
3. Backend → Fabric: "Query submissions"
4. Fabric → Blockchain: "Read ledger"
5. Blockchain → Fabric: "Return data" (dashed)
6-7. Response chain back to Sekretariat
8. Sekretariat → Frontend: "Click details"
9-12. Query submission by ID flow
13. Frontend → Sekretariat: "Show full details"
14. Sekretariat → Frontend: "Submit decision"
15. Frontend → Backend: "POST /decision"
16. Backend → Fabric: "Update status"
17. Fabric → Blockchain: "Record decision"
18. Backend → WebSocket: "Broadcast notification"
19. WebSocket → UPPS: "Real-time notification"
19b. WebSocket → Sekretariat: "Confirmation"

**Canva Search Keywords:**
- "sequence diagram verification"
- "approval process flowchart"

---

### 📊 SLIDE 6: Deployment Diagram (Gambar 5.1)

**Canva Template:** "Network Diagram" atau "Infrastructure Diagram"

**Design Elements (3D-style boxes):**

**Node 1: Client Browser** (Top left)
- 💻 Laptop/Browser icon
- Component: React Frontend Application
- Port: 3000/5173

**Node 2: Application Server** (Top right)
- 🖥️ Server icon
- Component: Express.js Backend API
- Port: 8000
- Sub-component: WebSocket Server

**Node 3: Blockchain Network** (Bottom left - largest)
- 🔗 Multiple connected servers
- **3 Organizations:**
  - Orderer (consensus node)
  - UPPS Peer + CouchDB:5984
  - Sekretariat Peer + CouchDB:6984
- Channel: akreditasi
- Chaincode: submission-contract

**Node 4: IPFS Network** (Bottom center)
- ☁️ Distributed cloud icon
- Component: Pinata Gateway
- Protocol: HTTPS

**Node 5: AI Service** (Bottom right)
- 🤖 Cloud + Brain icon
- Component: Google Gemini API
- Protocol: HTTPS REST

**Connections (labeled lines):**
- Client ↔ Server: <<HTTP/HTTPS>> + <<WebSocket>>
- Server → Blockchain: <<gRPC>>
- Server → IPFS: <<HTTPS>>
- Server → AI: <<REST API>>
- Blockchain internal: Peers ↔ CouchDB

**Canva Search Keywords:**
- "deployment diagram template"
- "network topology diagram"
- "infrastructure architecture"
- "server network diagram"

---

### 🎨 Canva Design Tips:

**1. Consistency:**
- Gunakan color palette yang sama di semua slide
- Recommended: Blue (#3498db), Green (#27ae60), Orange (#e67e22), Purple (#9b59b6), Teal (#1abc9c)

**2. Icons:**
- Search di Canva Elements: "blockchain", "server", "database", "ai", "cloud", "notification"
- Atau upload custom icons dari Flaticon/Icons8

**3. Typography:**
- Title: 24-28pt (Bold)
- Component labels: 14-16pt (Semi-bold)
- Descriptions: 10-12pt (Regular)
- Use: Inter, Roboto, atau Montserrat

**4. Layout:**
- Use Canva's align tools (Ctrl+Shift+L for left align)
- Consistent spacing: 20-30px between elements
- Grid view: Enable for precise positioning

**5. Export Settings:**
- File → Download → Microsoft PowerPoint (.pptx)
- Or: Share → Present (untuk present langsung dari Canva)

---

### 📐 Canva Presentation Specs:

**Format:** Presentation (16:9)
- **Width:** 1920px
- **Height:** 1080px
- **Aspect Ratio:** 16:9 (standard PowerPoint)

**Slide Dimensions:**
- Optimal for projection and screen sharing
- Compatible dengan PowerPoint, Google Slides, Keynote

---

### 🔄 Workflow Rekomendasi:

1. **Buat di Canva** menggunakan template "Presentation (16:9)"
2. **Design setiap slide** sesuai panduan di atas
3. **Export ke PPTX** (File → Download → PowerPoint)
4. **Edit final di PowerPoint** jika perlu penyesuaian
5. **Save as PDF** untuk dokumentasi (File → Save As → PDF)

---

### 🎯 Canva Pro Features (Opsional):

Jika punya Canva Pro:
- **Brand Kit:** Save warna & font untuk consistency
- **Magic Resize:** Ubah ukuran ke format lain (Instagram, A4, dll)
- **Background Remover:** Untuk icons/images
- **Animations:** Tambahkan animasi untuk presentasi

---

## 📊 Prompts Text-to-Image (AI Generators)

Gunakan prompts berikut untuk generate diagram menggunakan AI image generator (DALL-E, Midjourney, Stable Diffusion, dll)

---

## 📊 GAMBAR 2.1: Arsitektur Sistem

**Prompt:**
```
Create a professional technical architecture diagram for a blockchain-based accreditation system. The diagram should show:

1. Top layer: React Frontend (blue box, with React logo icon)
2. Middle layer: Express.js Backend (green box, with Node.js icon)
3. Bottom layer split into 4 components:
   - Hyperledger Fabric Blockchain (orange box, with blockchain icon)
   - Google Gemini AI (purple box, with AI/brain icon)
   - IPFS/Pinata Storage (teal box, with cloud/storage icon)
   - CouchDB Database (gray box, with database icon)

Connect components with arrows showing data flow:
- Bidirectional arrows between Frontend ↔ Backend
- Backend connects to all 4 bottom components
- Use clean, modern flat design style
- Professional color scheme: blue (#3498db), green (#27ae60), orange (#e67e22), purple (#9b59b6), teal (#1abc9c)
- Include small descriptive text labels for each component
- White/light gray background
- Minimal shadows and modern typography
- Architecture diagram style, not flowchart
```

**Alternative Prompt (More Technical):**
```
Technical system architecture diagram showing:
- Client tier: React.js web application (browser icon)
- Application tier: Express.js REST API server (server icon)
- Data tier: 
  * Hyperledger Fabric blockchain network (3 organizations: Orderer, UPPS, Sekretariat)
  * IPFS distributed storage via Pinata
  * Google Gemini AI service for document analysis
  * CouchDB for world state database

Use layered architecture visualization with clear separation between tiers. Modern tech stack diagram style with technology logos. Clean white background, professional blue and green color scheme. Show bidirectional data flow with labeled arrows.
```

---

## 📊 GAMBAR 3.1: Use Case Diagram

**Prompt:**
```
Create a UML use case diagram for a blockchain accreditation system showing:

Actors (stick figures on left and right):
1. UPPS (Unit Pengelola Program Studi) - on the left
2. Sekretariat LAM-TEK - on the right
3. AI System (Gemini) - on the right, robot icon

Use cases (ovals in center):
- "Upload LED/LKPS Documents"
- "View Submissions"
- "Analyze Document Completeness" (connected to AI System)
- "Review Submission Details"
- "Approve/Reject Submission"
- "View Scoring Results"
- "Receive Real-time Notifications"

System boundary: Large rectangle containing all use cases, labeled "Sistem Akreditasi Blockchain LAM-TEK 2025"

Relationships:
- UPPS connects to: Upload Documents, View Submissions, View Scoring Results, Receive Notifications
- Sekretariat connects to: View Submissions, Review Details, Approve/Reject, Receive Notifications
- AI System connects to: Analyze Document Completeness
- "Analyze Document Completeness" includes "Upload Documents" (dashed arrow with <<include>>)

UML standard notation, clean professional style, light blue system boundary box, black lines, white background
```

**Alternative Prompt (Simplified):**
```
Professional UML use case diagram with 3 actors (UPPS user, Sekretariat admin, AI robot) and 7 oval use cases inside a system boundary rectangle. Show associations with solid lines. Modern clean design, standard UML notation, light blue and white color scheme, professional diagram style for technical documentation.
```

---

## 📊 GAMBAR 4.1: Sequence Diagram - Upload Dokumen

**Prompt:**
```
Create a UML sequence diagram showing the document upload process in a blockchain system:

Participants (vertical lifelines from left to right):
1. UPPS (user icon)
2. Frontend React (browser icon)
3. Backend API (server icon)
4. Pinata Service (cloud icon)
5. IPFS (distributed network icon)
6. Gemini AI (AI brain icon)
7. Fabric Service (blockchain icon)
8. Blockchain (ledger icon)

Sequence of interactions (numbered messages with arrows):
1. UPPS → Frontend: "Fill form & select files"
2. Frontend → Backend: "POST /api/v1/upload (LED, LKPS)"
3. Backend → Pinata: "Upload files"
4. Pinata → IPFS: "Store files"
5. IPFS → Pinata: "Return CID & hash"
6. Pinata → Backend: "File metadata"
7. Backend → Gemini AI: "Analyze documents"
8. Gemini AI → Backend: "Analysis results (score, flags)"
9. Backend → Fabric: "Create submission"
10. Fabric → Blockchain: "Store metadata"
11. Blockchain → Fabric: "Transaction ID"
12. Backend → Frontend: "Submission created"
13. Frontend → UPPS: "Show results & notifications"

Use UML sequence diagram standard notation with:
- Vertical dashed lifelines
- Activation boxes on lifelines during processing
- Horizontal arrows for synchronous calls
- Dashed return arrows
- Clean professional style, white background
- Blue arrows for requests, green for responses
```

**Alternative Prompt (Compact):**
```
UML sequence diagram with 8 participants showing blockchain document upload flow. Vertical lifelines with activation boxes. 13 numbered message arrows showing: user input → frontend → backend → IPFS upload → AI analysis → blockchain storage → user notification. Professional technical diagram, standard UML notation, clean minimal design.
```

---

## 📊 GAMBAR 4.2: Sequence Diagram - Verifikasi Dokumen

**Prompt:**
```
Create a UML sequence diagram for document verification process:

Participants (vertical lifelines from left to right):
1. Sekretariat (admin user icon)
2. Frontend React (browser icon)
3. Backend API (server icon)
4. Fabric Service (blockchain icon)
5. Blockchain (ledger icon)
6. WebSocket Service (notification icon)
7. UPPS (user icon)

Sequence of interactions:
1. Sekretariat → Frontend: "View submissions list"
2. Frontend → Backend: "GET /api/v1/submissions"
3. Backend → Fabric: "Query submissions"
4. Fabric → Blockchain: "Read from ledger"
5. Blockchain → Fabric: "Return submission data"
6. Fabric → Backend: "Submission list"
7. Backend → Frontend: "Display submissions"
8. Sekretariat → Frontend: "Click submission details"
9. Frontend → Backend: "GET /api/v1/submissions/:id"
10. Backend → Fabric: "Query submission by ID"
11. Blockchain → Backend: "Return full details"
12. Frontend → Sekretariat: "Show details (documents, AI results, hash)"
13. Sekretariat → Frontend: "Submit decision (approve/reject + notes)"
14. Frontend → Backend: "POST /api/v1/submissions/:id/decision"
15. Backend → Fabric: "Update submission status"
16. Fabric → Blockchain: "Record decision"
17. Backend → WebSocket: "Broadcast notification"
18. WebSocket → UPPS: "Real-time notification"
19. WebSocket → Sekretariat: "Confirmation"

UML standard notation, activation boxes, blue request arrows, green response arrows, dashed return messages, clean professional style
```

**Alternative Prompt (Simplified):**
```
UML sequence diagram showing verification workflow with 7 participants. Vertical lifelines with 19 message interactions covering: query submissions → view details → make decision → update blockchain → send notifications. Standard UML notation, professional technical diagram, white background.
```

---

## 📊 GAMBAR 5.1: Deployment Diagram

**Prompt:**
```
Create a UML deployment diagram showing system infrastructure:

Nodes (3D boxes):
1. Client Browser Node (laptop/browser icon)
   - Component: React Frontend Application
   - Port: 3000/5173

2. Application Server Node (server icon)
   - Component: Express.js Backend API
   - Port: 8000
   - WebSocket Server

3. Blockchain Network Node (multiple connected servers)
   - 3 Organizations:
     * Orderer (consensus node)
     * UPPS Peer + CouchDB (port 5984)
     * Sekretariat Peer + CouchDB (port 6984)
   - Channel: akreditasi
   - Chaincode: submission-contract

4. IPFS Network Node (distributed cloud icon)
   - Component: Pinata Gateway
   - Protocol: HTTPS

5. AI Service Node (cloud with brain icon)
   - Component: Google Gemini API
   - Protocol: HTTPS REST

Connections:
- Client ↔ Application Server: HTTP/HTTPS + WebSocket
- Application Server → Blockchain Network: gRPC
- Application Server → IPFS: HTTPS
- Application Server → AI Service: HTTPS REST
- Blockchain Peers ↔ CouchDB: Internal connection

Use UML deployment diagram notation:
- 3D node boxes with icons
- Dashed lines for communication paths
- Protocol labels on connections (<<HTTP>>, <<gRPC>>, etc.)
- Component boxes inside nodes
- Professional color scheme: blue for client, green for server, orange for blockchain
- Clean modern style, white background
```

**Alternative Prompt (Infrastructure Focus):**
```
Infrastructure deployment diagram showing 5 deployment nodes:
- Client tier (browser)
- Application tier (Node.js server)
- Blockchain tier (3 Hyperledger Fabric organizations with peers and databases)
- Storage tier (IPFS/Pinata)
- AI tier (Google Gemini)

Show physical deployment with server icons, network connections, ports, and protocols. UML deployment diagram style with 3D boxes. Professional technical architecture visualization. Clean minimal design.
```

---

## 🎨 Tips untuk Generate Gambar:

### Untuk DALL-E / ChatGPT:
- Gunakan prompt lengkap pertama
- Tambahkan "high quality, professional technical diagram" di akhir
- Request "white background, suitable for documentation"

### Untuk Midjourney:
- Gunakan prompt lengkap + tambahkan parameter:
  ```
  --style raw --v 6 --ar 16:9 --q 2
  ```
- Untuk diagram yang lebih clean:
  ```
  --style raw --v 6 --ar 16:9 --q 2 --no photorealistic,shadows,3d
  ```

### Untuk Stable Diffusion:
- Gunakan prompt dengan keywords:
  ```
  technical diagram, UML, professional, clean, minimal, white background, 
  vector style, flat design, infographic
  ```
- Negative prompt:
  ```
  photorealistic, realistic, shadows, gradients, complex, cluttered, 
  dark background, sketch, hand-drawn
  ```

### Alternatif Manual (Recommended):
Untuk hasil terbaik, gunakan tools diagram profesional:
- **Draw.io / diagrams.net** (gratis, online)
- **Lucidchart** (online, template UML lengkap)
- **Microsoft Visio** (desktop, profesional)
- **PlantUML** (code-based, otomatis)
- **Mermaid.js** (code-based, untuk web)

---

## 📐 Spesifikasi Ukuran Gambar:

Untuk dokumentasi tabloid portrait:
- **Width:** 1600-2000px
- **Height:** 1000-1400px (tergantung diagram)
- **Format:** PNG atau SVG (SVG lebih baik untuk scaling)
- **Resolution:** 300 DPI untuk print quality

Aspect ratio yang disarankan:
- **Arsitektur:** 16:10 atau 3:2
- **Use Case:** 4:3 atau 16:10
- **Sequence:** 16:9 (landscape)
- **Deployment:** 16:10 atau 3:2

---

## 🔄 Workflow yang Disarankan:

1. **Generate dengan AI** → Edit manual untuk detail teknis
2. **Gunakan PlantUML/Mermaid** untuk diagram UML standar
3. **Export ke PNG/SVG** dengan resolusi tinggi
4. **Insert ke HTML** dengan ukuran yang sesuai

---

Semua prompt sudah disesuaikan dengan sistem yang dijelaskan di dokumentasi!
