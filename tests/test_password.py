from application.security import hash_password, verify_password


def test_password_hashing():

    password = "MySecurePassword123"

    hashed = hash_password(password)

    # Hash must differ from the original password
    assert hashed != password

    # Correct password must be accepted
    assert verify_password(password, hashed)

    # Incorrect password must be rejected
    assert not verify_password("WrongPassword123", hashed)

    print("Password hashing tests passed!")


if __name__ == "__main__":
    test_password_hashing()
