from fastapi import FastAPI
from pydantic import BaseModel

from application.assistant import Assistant
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Al-Musaid 2.0 API",
    description="Backend API for the Al-Musaid banking assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    success: bool
    response: str


assistant = Assistant()


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):

    result = await assistant.process_message(request.message)

    return result
