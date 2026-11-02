import asyncio

from application.assistant import Assistant


async def main():
    assistant = Assistant()

    question = "ما الفرق بين الحساب الجاري وحساب التوفير؟"

    result = await assistant.process_message(question)

    print("\nQuestion:")
    print(question)

    print("\nResult:")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
