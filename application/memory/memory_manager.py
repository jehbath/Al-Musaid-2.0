import sqlite3
import json

from pathlib import Path
from datetime import datetime, timezone


class ConversationMemory:

    def __init__(self, db_path=None):

        project_root = Path(__file__).resolve().parents[2]

        if db_path is None:
            db_path = project_root / "database" / "memory.db"

        self.db_path = Path(db_path)

        self.db_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self._initialize_database()

    # Create database connection
    def _get_connection(self):

        connection = sqlite3.connect(
            self.db_path,
            timeout=10,
        )

        connection.row_factory = sqlite3.Row

        connection.execute("PRAGMA foreign_keys = ON")

        return connection

    # Initialize database tables
    def _initialize_database(self):

        with self._get_connection() as connection:

            connection.execute("""
                CREATE TABLE IF NOT EXISTS conversations (

                    conversation_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL

                )
            """)

            connection.execute("""
                CREATE TABLE IF NOT EXISTS messages (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,

                    FOREIGN KEY (conversation_id)
                        REFERENCES conversations(conversation_id)
                        ON DELETE CASCADE

                )
            """)

            connection.execute("""
                CREATE INDEX IF NOT EXISTS
                idx_messages_conversation

                ON messages(conversation_id, id)
            """)

            # Store the latest location for each conversation
            connection.execute("""
                CREATE TABLE IF NOT EXISTS conversation_locations (

                    conversation_id TEXT PRIMARY KEY,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    updated_at TEXT NOT NULL,

                    FOREIGN KEY (conversation_id)
                        REFERENCES conversations(conversation_id)
                        ON DELETE CASCADE

                )
            """)

            # Store structured state for each conversation
            connection.execute("""
                CREATE TABLE IF NOT EXISTS conversation_state (

                    conversation_id TEXT PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,

                    FOREIGN KEY (conversation_id)
                        REFERENCES conversations(conversation_id)
                        ON DELETE CASCADE

                )
            """)

            # Store conversation summary
            connection.execute("""
                CREATE TABLE IF NOT EXISTS conversation_summaries (

                    conversation_id TEXT PRIMARY KEY,
                    summary TEXT NOT NULL,
                    last_summarized_message_id INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL,

                    FOREIGN KEY (conversation_id)
                        REFERENCES conversations(conversation_id)
                        ON DELETE CASCADE

                )
            """)

            # Support existing databases
            columns = connection.execute(
                "PRAGMA table_info(conversation_summaries)"
            ).fetchall()

            column_names = [column["name"] for column in columns]

            if "last_summarized_message_id" not in column_names:

                connection.execute("""
                    ALTER TABLE conversation_summaries

                    ADD COLUMN last_summarized_message_id
                    INTEGER NOT NULL DEFAULT 0
                """)

    # Get recent conversation messages
    def get_recent_messages(
        self,
        conversation_id,
        limit=10,
    ):

        if not conversation_id:
            return []

        limit = max(1, int(limit))

        with self._get_connection() as connection:

            rows = connection.execute(
                """
                SELECT role, content

                FROM messages

                WHERE conversation_id = ?

                ORDER BY id DESC

                LIMIT ?
                """,
                (conversation_id, limit),
            ).fetchall()

        return [
            {
                "role": row["role"],
                "content": row["content"],
            }
            for row in reversed(rows)
        ]

    # Save a complete user-assistant exchange
    def save_exchange(
        self,
        conversation_id,
        user_message,
        assistant_response,
    ):

        if not conversation_id:
            raise ValueError("conversation_id is required")

        if not user_message or not assistant_response:
            raise ValueError("Both user_message and assistant_response are required")

        now = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as connection:

            connection.execute(
                """
                INSERT OR IGNORE INTO conversations (
                    conversation_id,
                    created_at,
                    updated_at
                )

                VALUES (?, ?, ?)
                """,
                (conversation_id, now, now),
            )

            connection.execute(
                """
                INSERT INTO messages (
                    conversation_id,
                    role,
                    content,
                    created_at
                )

                VALUES (?, ?, ?, ?)
                """,
                (conversation_id, "user", user_message, now),
            )

            connection.execute(
                """
                INSERT INTO messages (
                    conversation_id,
                    role,
                    content,
                    created_at
                )

                VALUES (?, ?, ?, ?)
                """,
                (
                    conversation_id,
                    "assistant",
                    assistant_response,
                    now,
                ),
            )

            connection.execute(
                """
                UPDATE conversations

                SET updated_at = ?

                WHERE conversation_id = ?
                """,
                (now, conversation_id),
            )

    # Get messages older than the recent conversation window
    def get_older_messages(
        self,
        conversation_id,
        keep_recent=6,
    ):

        if not conversation_id:
            return []

        keep_recent = max(1, int(keep_recent))

        with self._get_connection() as connection:

            rows = connection.execute(
                """
                SELECT id, role, content

                FROM messages

                WHERE conversation_id = ?

                AND id NOT IN (
                    SELECT id
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                )

                ORDER BY id ASC
                """,
                (
                    conversation_id,
                    conversation_id,
                    keep_recent,
                ),
            ).fetchall()

        return [
            {
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
            }
            for row in rows
        ]

    # Get the ID of the last summarized message
    def get_last_summarized_message_id(self, conversation_id):

        if not conversation_id:
            return 0

        with self._get_connection() as connection:

            row = connection.execute(
                """
                SELECT last_summarized_message_id

                FROM conversation_summaries

                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()

        if row is None:
            return 0

        return row["last_summarized_message_id"]

    # Get messages that have not been summarized yet
    # The latest messages are kept outside the summary window
    def get_unsummarized_messages(
        self,
        conversation_id,
        keep_recent=6,
    ):

        if not conversation_id:
            return []

        keep_recent = max(1, int(keep_recent))

        last_summarized_id = self.get_last_summarized_message_id(conversation_id)

        with self._get_connection() as connection:

            rows = connection.execute(
                """
                SELECT id, role, content

                FROM messages

                WHERE conversation_id = ?

                AND id > ?

                AND id NOT IN (
                    SELECT id
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                )

                ORDER BY id ASC
                """,
                (
                    conversation_id,
                    last_summarized_id,
                    conversation_id,
                    keep_recent,
                ),
            ).fetchall()

        return [
            {
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
            }
            for row in rows
        ]

    # Save or update conversation summary
    def save_conversation_summary(
        self,
        conversation_id,
        summary,
        last_summarized_message_id=0,
    ):

        if not conversation_id:
            raise ValueError("conversation_id is required")

        if not isinstance(summary, str):
            raise ValueError("summary must be a string")

        if (
            not isinstance(last_summarized_message_id, int)
            or isinstance(last_summarized_message_id, bool)
            or last_summarized_message_id < 0
        ):
            raise ValueError(
                "last_summarized_message_id must be a non-negative integer"
            )

        now = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as connection:

            connection.execute(
                """
                INSERT OR IGNORE INTO conversations (
                    conversation_id,
                    created_at,
                    updated_at
                )

                VALUES (?, ?, ?)
                """,
                (conversation_id, now, now),
            )

            connection.execute(
                """
                INSERT INTO conversation_summaries (
                    conversation_id,
                    summary,
                    last_summarized_message_id,
                    updated_at
                )

                VALUES (?, ?, ?, ?)

                ON CONFLICT(conversation_id)

                DO UPDATE SET
                    summary = excluded.summary,
                    last_summarized_message_id =
                        excluded.last_summarized_message_id,
                    updated_at = excluded.updated_at
                """,
                (
                    conversation_id,
                    summary,
                    last_summarized_message_id,
                    now,
                ),
            )

            connection.execute(
                """
                UPDATE conversations

                SET updated_at = ?

                WHERE conversation_id = ?
                """,
                (now, conversation_id),
            )

    # Retrieve conversation summary
    def get_conversation_summary(self, conversation_id):

        if not conversation_id:
            return ""

        with self._get_connection() as connection:

            row = connection.execute(
                """
                SELECT summary

                FROM conversation_summaries

                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()

        if row is None:
            return ""

        return row["summary"]

    # Save or update the latest location
    def save_location(
        self,
        conversation_id,
        latitude,
        longitude,
    ):

        if not conversation_id:
            raise ValueError("conversation_id is required")

        if latitude is None or longitude is None:
            raise ValueError("Latitude and longitude are required")

        now = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as connection:

            connection.execute(
                """
                INSERT OR IGNORE INTO conversations (
                    conversation_id,
                    created_at,
                    updated_at
                )

                VALUES (?, ?, ?)
                """,
                (conversation_id, now, now),
            )

            connection.execute(
                """
                INSERT INTO conversation_locations (
                    conversation_id,
                    latitude,
                    longitude,
                    updated_at
                )

                VALUES (?, ?, ?, ?)

                ON CONFLICT(conversation_id)

                DO UPDATE SET
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    updated_at = excluded.updated_at
                """,
                (conversation_id, latitude, longitude, now),
            )

    # Retrieve the latest saved location
    def get_saved_location(self, conversation_id):

        if not conversation_id:
            return None

        with self._get_connection() as connection:

            row = connection.execute(
                """
                SELECT latitude, longitude

                FROM conversation_locations

                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()

        if row is None:
            return None

        return {
            "latitude": row["latitude"],
            "longitude": row["longitude"],
        }

    # Delete saved location
    def delete_saved_location(self, conversation_id):

        if not conversation_id:
            return

        with self._get_connection() as connection:

            connection.execute(
                """
                DELETE FROM conversation_locations

                WHERE conversation_id = ?
                """,
                (conversation_id,),
            )

    # Retrieve structured conversation state
    def get_conversation_state(self, conversation_id):

        if not conversation_id:
            return {}

        with self._get_connection() as connection:

            row = connection.execute(
                """
                SELECT state_json

                FROM conversation_state

                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()

        if row is None:
            return {}

        state = json.loads(row["state_json"])

        if not isinstance(state, dict):
            raise ValueError("Conversation state must be a dictionary")

        return state

    # Save the complete conversation state
    def save_conversation_state(
        self,
        conversation_id,
        state,
    ):

        if not conversation_id:
            raise ValueError("conversation_id is required")

        if not isinstance(state, dict):
            raise ValueError("state must be a dictionary")

        now = datetime.now(timezone.utc).isoformat()

        state_json = json.dumps(
            state,
            ensure_ascii=False,
        )

        with self._get_connection() as connection:

            connection.execute(
                """
                INSERT OR IGNORE INTO conversations (
                    conversation_id,
                    created_at,
                    updated_at
                )

                VALUES (?, ?, ?)
                """,
                (conversation_id, now, now),
            )

            connection.execute(
                """
                INSERT INTO conversation_state (
                    conversation_id,
                    state_json,
                    updated_at
                )

                VALUES (?, ?, ?)

                ON CONFLICT(conversation_id)

                DO UPDATE SET
                    state_json = excluded.state_json,
                    updated_at = excluded.updated_at
                """,
                (conversation_id, state_json, now),
            )

            connection.execute(
                """
                UPDATE conversations

                SET updated_at = ?

                WHERE conversation_id = ?
                """,
                (now, conversation_id),
            )

    # Update selected fields without deleting existing state
    def update_conversation_state(
        self,
        conversation_id,
        updates,
    ):

        if not isinstance(updates, dict):
            raise ValueError("updates must be a dictionary")

        current_state = self.get_conversation_state(conversation_id)

        current_state.update(updates)

        self.save_conversation_state(
            conversation_id,
            current_state,
        )

        return current_state

    # Clear structured conversation state
    def clear_conversation_state(self, conversation_id):

        if not conversation_id:
            return

        with self._get_connection() as connection:

            connection.execute(
                """
                DELETE FROM conversation_state

                WHERE conversation_id = ?
                """,
                (conversation_id,),
            )
