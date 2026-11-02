from application.memory.memory_manager import ConversationMemory


def test_conversation_state():

    memory = ConversationMemory(db_path="test_memory.db")

    conversation_id = "test_conversation_001"

    # Save initial state
    memory.save_conversation_state(
        conversation_id,
        {
            "salary": {
                "amount": 5000,
                "currency": "SAR",
            },
            "total_purchases": 380,
            "calculated_amount": 4620,
        },
    )

    # Retrieve state
    state = memory.get_conversation_state(conversation_id)

    print("Initial state:")
    print(state)

    # Update calculated amount
    updated_state = memory.update_conversation_state(
        conversation_id,
        {
            "calculated_amount": 4320,
            "last_operation": {
                "type": "subtract",
                "amount": 300,
            },
        },
    )

    print("\nUpdated state:")
    print(updated_state)

    # Verify persistence
    new_memory = ConversationMemory(db_path="test_memory.db")

    persisted_state = new_memory.get_conversation_state(conversation_id)

    print("\nPersisted state:")
    print(persisted_state)

    assert persisted_state["salary"]["amount"] == 5000
    assert persisted_state["total_purchases"] == 380
    assert persisted_state["calculated_amount"] == 4320
    assert persisted_state["last_operation"]["amount"] == 300

    print("\nAll conversation state tests passed!")


if __name__ == "__main__":
    test_conversation_state()
