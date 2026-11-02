from pathlib import Path
from application.memory.memory_manager import ConversationMemory


def test_summary_tracking():

    db_path = Path("test_tracking.db")

    if db_path.exists():
        db_path.unlink()

    memory = ConversationMemory(db_path)

    conversation_id = "tracking-test-001"

    # Initial tracking value
    last_id = memory.get_last_summarized_message_id(conversation_id)

    assert last_id == 0

    print("Initial tracking test: PASSED")

    # Save summary with message ID
    memory.save_conversation_summary(
        conversation_id,
        "The user asked about their account balance.",
        last_summarized_message_id=10,
    )

    last_id = memory.get_last_summarized_message_id(conversation_id)

    assert last_id == 10

    print("Save tracking test: PASSED")

    # Update summary with a newer message ID
    memory.save_conversation_summary(
        conversation_id,
        "The account balance is 3500 SAR.",
        last_summarized_message_id=20,
    )

    last_id = memory.get_last_summarized_message_id(conversation_id)

    assert last_id == 20

    print("Update tracking test: PASSED")

    # Persistence test
    new_memory = ConversationMemory(db_path)

    last_id = new_memory.get_last_summarized_message_id(conversation_id)

    assert last_id == 20

    print("Persistence test: PASSED")

    print("\nAll Summary Tracking tests passed!")


if __name__ == "__main__":
    test_summary_tracking()
