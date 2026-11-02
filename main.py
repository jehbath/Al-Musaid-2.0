from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4

from application.assistant import Assistant

app = FastAPI()


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Assistant
assistant = Assistant()


# Request model
class ChatRequest(BaseModel):

    message: str

    conversation_id: str | None = None

    latitude: float | None = None

    longitude: float | None = None

    location_error: str | None = None


# Chat endpoint
@app.post("/chat")
async def chat(request: ChatRequest):

    # Generate a new conversation ID if one was not provided
    conversation_id = request.conversation_id or str(uuid4())

    print("CHAT REQUEST:", request.model_dump())

    result = await assistant.process_message(
        user_message=request.message,
        conversation_id=conversation_id,
        latitude=request.latitude,
        longitude=request.longitude,
        location_error=request.location_error,
    )

    # Return conversation ID to the frontend
    result["conversation_id"] = conversation_id

    return result
