from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database.database import get_connection
from application.security import hash_password, verify_password, create_access_token
from fastapi import Depends
from application.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(request: RegisterRequest):

    name = request.name.strip()
    email = request.email.strip().lower()

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Check whether the email already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))

        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Email is already registered.")

        # Hash password
        hashed_password = hash_password(request.password)

        # Create user
        cursor.execute(
            """
            INSERT INTO users
            (name, email, password_hash, is_active, created_at)
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            """,
            (name, email, hashed_password),
        )

        user_id = cursor.lastrowid

        connection.commit()

        return {
            "success": True,
            "message": "User registered successfully.",
            "user": {"id": user_id, "name": name, "email": email},
        }

    finally:
        connection.close()


@router.post("/login")
def login(request: LoginRequest):

    email = request.email.strip().lower()

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, name, email, password_hash, is_active
            FROM users
            WHERE email = ?
            """,
            (email,),
        )

        user = cursor.fetchone()

        # Generic error to avoid revealing whether email exists
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        user_id, name, email, stored_hash, is_active = user

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
            "user": {"id": user_id, "name": name, "email": email},
        }

    finally:
        connection.close()


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):

    return {"success": True, "user": current_user}
