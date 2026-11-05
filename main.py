from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from uuid import uuid4

from application.auth import router as auth_router
from application.dependencies import get_optional_user
from application.conversations import create_conversations_router
from application.assistant import Assistant

app = FastAPI()
app.include_router(auth_router)

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

# Conversation history endpoints (share the same memory store)
app.include_router(create_conversations_router(assistant.memory))


# Request model
class ChatRequest(BaseModel):

    message: str

    conversation_id: str | None = Field(default=None, max_length=100)

    latitude: float | None = None

    longitude: float | None = None

    location_error: str | None = None


# Chat endpoint
@app.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: dict | None = Depends(get_optional_user),
):

    # Generate a new conversation ID if one was not provided
    conversation_id = request.conversation_id or str(uuid4())

    # Trusted user ID comes only from the validated JWT, never from the request body
    user_id = current_user["id"] if current_user else None

    print("CHAT REQUEST:", request.model_dump(), "| USER ID:", user_id)

    # Conversation isolation: a user may only use their own conversations,
    # and a guest only guest conversations. Checked before any processing.
    if not assistant.memory.claim_or_verify_conversation(conversation_id, user_id):

        print("CONVERSATION ACCESS DENIED:", conversation_id, "| USER ID:", user_id)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="conversation_forbidden",
        )

    result = await assistant.process_message(
        user_message=request.message,
        conversation_id=conversation_id,
        user_id=user_id,
        user_name=current_user["name"] if current_user else None,
        latitude=request.latitude,
        longitude=request.longitude,
        location_error=request.location_error,
    )

    # Return conversation ID to the frontend
    result["conversation_id"] = conversation_id

    return result
