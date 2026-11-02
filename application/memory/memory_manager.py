import sqlite3
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
                (
                    conversation_id,
                    now,
                    now,
                ),
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
                    "user",
                    user_message,
                    now,
                ),
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
                (
                    now,
                    conversation_id,
                ),
            )

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

            # Ensure that the conversation exists
            connection.execute(
                """
                INSERT OR IGNORE INTO conversations (
                    conversation_id,
                    created_at,
                    updated_at
                )

                VALUES (?, ?, ?)
                """,
                (
                    conversation_id,
                    now,
                    now,
                ),
            )

            # Insert or update the saved location
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
                (
                    conversation_id,
                    latitude,
                    longitude,
                    now,
                ),
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
