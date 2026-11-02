from application.memory.memory_manager import ConversationMemory
from pathlib import Path


def test_conversation_summary():

    db_path = Path("test_summary.db")

    if db_path.exists():
        db_path.unlink()

    memory = ConversationMemory(db_path)

    conversation_id = "test-summary-001"

    # Test initial summary
    summary = memory.get_conversation_summary(conversation_id)

    assert summary == ""

    print("Initial summary test: PASSED")

    # Save summary
    first_summary = "The user asked about an account balance of 3500 SAR."

    memory.save_conversation_summary(
        conversation_id,
        first_summary,
    )

    saved_summary = memory.get_conversation_summary(conversation_id)

    assert saved_summary == first_summary

    print("Save summary test: PASSED")

    # Update summary
    updated_summary = (
        "The original balance is 3500 SAR. "
        "The user performed a hypothetical subtraction of 300 SAR."
    )

    memory.save_conversation_summary(
        conversation_id,
        updated_summary,
    )

    saved_summary = memory.get_conversation_summary(conversation_id)

    assert saved_summary == updated_summary

    print("Update summary test: PASSED")

    # Test persistence
    new_memory = ConversationMemory("test_summary.db")

    saved_summary = new_memory.get_conversation_summary(conversation_id)

    assert saved_summary == updated_summary

    print("Persistence test: PASSED")

    print("\nAll Summary Memory tests passed!")


if __name__ == "__main__":
    test_conversation_summary()
