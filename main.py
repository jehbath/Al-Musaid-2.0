from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

    latitude: float | None = None

    longitude: float | None = None

    location_error: str | None = None


# Response model
class ChatResponse(BaseModel):

    success: bool

    action: str

    response: str

    location_type: str | None = None


# Chat endpoint
@app.post("/chat")
async def chat(request: ChatRequest):

    print("CHAT REQUEST:", request.model_dump())

    result = await assistant.process_message(
        user_message=request.message,
        latitude=request.latitude,
        longitude=request.longitude,
        location_error=request.location_error,
    )

    return result
