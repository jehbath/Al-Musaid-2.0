from application.memory.memory_manager import ConversationMemory

memory = ConversationMemory()

conversation_id = "test-conversation-001"

memory.save_exchange(
    conversation_id=conversation_id,
    user_message="كم رصيدي؟",
    assistant_response="رصيدك الحالي 3500 ريال.",
)

memory.save_exchange(
    conversation_id=conversation_id,
    user_message="ما آخر عملية؟",
    assistant_response="آخر عملية كانت شراء بقيمة 80 ريال.",
)

history = memory.get_recent_messages(
    conversation_id=conversation_id,
    limit=10,
)

for message in history:
    print(message["role"], ":", message["content"])
