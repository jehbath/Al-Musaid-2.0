import asyncio

from application.assistant import Assistant


async def main():

    assistant = Assistant()

    result = await assistant.process_message("مرحبا، كيف حالك؟")

    print("Assistant result:")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
