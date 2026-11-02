from pathlib import Path
from functools import lru_cache
import re
from difflib import SequenceMatcher

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_BASE_PATH = BASE_DIR / "knowledge_base" / "banking_faq.md"

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def load_knowledge_base():
    if not KNOWLEDGE_BASE_PATH.exists():
        raise FileNotFoundError(f"Knowledge base not found: {KNOWLEDGE_BASE_PATH}")

    return KNOWLEDGE_BASE_PATH.read_text(encoding="utf-8")


def normalize_arabic(text):
    text = text.strip().lower()

    text = text.replace("أ", "ا")
    text = text.replace("إ", "ا")
    text = text.replace("آ", "ا")
    text = text.replace("ى", "ي")
    text = text.replace("ة", "ه")

    text = re.sub(r"[\u064B-\u065F\u0670]", "", text)
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def split_into_chunks(text):
    sections = re.split(r"(?m)(?=^## )", text)

    chunks = []

    for section in sections:
        section = section.strip()

        if section:
            chunks.append(section)

    return chunks


@lru_cache(maxsize=1)
def get_embedding_model():
    return SentenceTransformer(MODEL_NAME)


@lru_cache(maxsize=1)
def get_knowledge_base_embeddings():
    document = load_knowledge_base()
    chunks = split_into_chunks(document)

    if not chunks:
        return [], None

    model = get_embedding_model()

    embeddings = model.encode(
        chunks,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    return chunks, embeddings


def calculate_keyword_score(query, chunk):
    query_words = set(normalize_arabic(query).split())
    chunk_words = set(normalize_arabic(chunk).split())

    # Ignore very short words that are unlikely to help retrieval.
    query_words = {word for word in query_words if len(word) >= 3}

    if not query_words:
        return 0.0

    matched_words = query_words.intersection(chunk_words)

    exact_score = len(matched_words) / len(query_words)

    # Approximate matching helps with spelling mistakes such as
    # "الحشاب" instead of "الحساب".
    unmatched_words = query_words - matched_words
    approximate_matches = 0

    for query_word in unmatched_words:
        for chunk_word in chunk_words:
            if len(chunk_word) < 3:
                continue

            similarity = SequenceMatcher(
                None,
                query_word,
                chunk_word,
            ).ratio()

            if similarity >= 0.75:
                approximate_matches += 1
                break

    approximate_score = approximate_matches / len(query_words)

    return min(1.0, exact_score + approximate_score)


def search_knowledge_base(query, top_k=3):
    if not query or not query.strip():
        return []

    if top_k < 1:
        return []

    chunks, chunk_embeddings = get_knowledge_base_embeddings()

    if not chunks:
        return []

    model = get_embedding_model()

    normalized_query = normalize_arabic(query)

    query_embedding = model.encode(
        [normalized_query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    semantic_scores = cosine_similarity(
        query_embedding,
        chunk_embeddings,
    )[0]

    results = []

    for index, chunk in enumerate(chunks):
        keyword_score = calculate_keyword_score(query, chunk)

        # Combine semantic similarity with keyword matching.
        combined_score = 0.70 * float(semantic_scores[index]) + 0.30 * keyword_score

        results.append(
            {
                "chunk": chunk,
                "score": combined_score,
                "semantic_score": float(semantic_scores[index]),
                "keyword_score": keyword_score,
            }
        )

    results.sort(
        key=lambda result: result["score"],
        reverse=True,
    )

    return results[:top_k]


if __name__ == "__main__":
    document = load_knowledge_base()
    chunks = split_into_chunks(document)

    print("Document loaded successfully.")
    print(f"Number of chunks: {len(chunks)}")

    questions = [
        "ما الفرق بين الحساب الجاري وحساب التوفير؟",
        "مالفرق بين الحشاب الجاري والتوفير ؟",
    ]

    for question in questions:
        print(f"\n{'=' * 60}")
        print("QUESTION:", question)

        results = search_knowledge_base(question, top_k=3)

        for index, result in enumerate(results, start=1):
            print(f"\nResult {index}")
            print("Combined score:", round(result["score"], 4))
            print("Semantic score:", round(result["semantic_score"], 4))
            print("Keyword score:", round(result["keyword_score"], 4))
            print("Chunk:")
            print(result["chunk"])
