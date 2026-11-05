from fastapi import APIRouter, Depends, HTTPException, status

from application.dependencies import get_current_user, get_optional_user


def create_conversations_router(memory):
    """
    Conversation history endpoints.

    The memory store is shared with the Assistant so both use the same data.
    """

    router = APIRouter(prefix="/conversations", tags=["Conversations"])

    @router.get("")
    def list_conversations(current_user: dict = Depends(get_current_user)):
        """List the authenticated user's own conversations only."""

        return {
            "success": True,
            "conversations": memory.list_user_conversations(current_user["id"]),
        }

    @router.get("/{conversation_id}/messages")
    def get_messages(
        conversation_id: str,
        current_user: dict | None = Depends(get_optional_user),
    ):
        """
        Return a conversation's messages if the requester owns it.

        - Authenticated user -> only their own conversations.
        - Guest              -> only guest conversations.

        404 is returned for both "missing" and "not yours",
        so the endpoint does not reveal which conversation IDs exist.
        """

        user_id = current_user["id"] if current_user else None

        if len(conversation_id) > 100 or not memory.can_access_conversation(
            conversation_id, user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )

        return {
            "success": True,
            "conversation_id": conversation_id,
            "messages": memory.get_conversation_messages(conversation_id),
        }

    @router.delete("/{conversation_id}")
    def delete_conversation(
        conversation_id: str,
        current_user: dict | None = Depends(get_optional_user),
    ):
        """
        Delete a conversation if the requester owns it
        (same ownership rules as reading it).
        """

        user_id = current_user["id"] if current_user else None

        if len(conversation_id) > 100 or not memory.can_access_conversation(
            conversation_id, user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )

        memory.delete_conversation(conversation_id)

        return {"success": True, "conversation_id": conversation_id}

    return router
