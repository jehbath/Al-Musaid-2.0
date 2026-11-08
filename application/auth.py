from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.database import get_connection
from application.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Note: there is no public registration endpoint.
# Customer accounts are created by the bank; this app only authenticates
# existing users (see database/database.py for demo/test users).


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(request: LoginRequest):

    email = request.email.strip().lower()

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, name, email, password_hash, is_active, gender
            FROM users
            WHERE email = ?
            """,
            (email,),
        )

        user = cursor.fetchone()

        # Generic error to avoid revealing whether email exists
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        user_id, name, email, stored_hash, is_active, gender = user

        if not is_active:
            raise HTTPException(status_code=403, detail="This account is inactive.")

        if not stored_hash or not verify_password(request.password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        # Generate JWT
        access_token = create_access_token(user_id)

        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"id": user_id, "name": name, "email": email, "gender": gender},
        }

    finally:
        connection.close()
