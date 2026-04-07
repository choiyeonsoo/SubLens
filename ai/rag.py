"""
RAG 검색 유틸리티 — ChromaDB에서 관련 청크를 조회합니다.
"""

from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions

_DB_PATH = str(Path(__file__).parent / "chroma_db")
_EF = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="paraphrase-multilingual-mpnet-base-v2"
)

_client: chromadb.PersistentClient | None = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=_DB_PATH)
    return _client


def retrieve(question: str, collection_name: str, top_k: int = 4) -> list[str]:
    """
    question과 가장 유사한 청크를 top_k개 반환합니다.
    컬렉션이 존재하지 않으면 빈 리스트를 반환합니다.
    """
    client = _get_client()
    try:
        collection = client.get_collection(name=collection_name, embedding_function=_EF)
    except Exception:
        return []

    results = collection.query(query_texts=[question], n_results=top_k)
    docs = results.get("documents", [[]])[0]
    return docs
