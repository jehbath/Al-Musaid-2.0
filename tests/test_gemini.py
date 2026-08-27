from application.gemini_client import GeminiClient


def main():
    gemini = GeminiClient()

    response = gemini.generate_response("Hello, introduce yourself briefly.")

    print("Gemini response:")
    print(response)


if __name__ == "__main__":
    main()
