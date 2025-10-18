from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_service import manager

router = APIRouter(tags=["websocket"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query(None)
):
    """
    WebSocket endpoint for real-time notifications
    
    Connect to receive real-time updates about:
    - SubmissionCreated
    - AIRecommendationAttached
    - SubmissionDecided
    - SubmissionDocumentsUpdated
    
    Example client code:
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/ws?user_id=upps123');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Event:', data.event, 'Payload:', data.payload);
    };
    ```
    """
    await manager.connect(websocket, user_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message({
            "event": "connected",
            "message": "Connected to notification service",
            "user_id": user_id
        }, websocket)
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await manager.send_personal_message({
                "event": "pong",
                "message": "Connection alive"
            }, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
