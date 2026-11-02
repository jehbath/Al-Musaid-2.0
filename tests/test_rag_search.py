from application.rag import search_knowledge_base


def main():
    questions = [
        "ما الفرق بين الحساب الجاري وحساب التوفير؟",
        "مالفرق بين الحشاب الجاري والتوفير ؟",
    ]

    for question in questions:
        print("\n" + "=" * 60)
        print("QUESTION:", question)

        results = search_knowledge_base(question, top_k=3)

        for index, result in enumerate(results, start=1):
            print(f"\nResult {index}")
            print("Score:", round(result["score"], 4))
            print("Chunk:")
            print(result["chunk"])


if __name__ == "__main__":
    main()
