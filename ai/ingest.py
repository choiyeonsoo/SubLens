"""
PDF 문서를 읽어서 ChromaDB에 임베딩을 저장하는 1회 실행 스크립트.

사용법:
  python ingest.py --pdf ../SUBLENS_사용가이드.pdf --collection sublens_guide
  python ingest.py --pdf ../SUBLENS_RAG_Guide.pdf  --collection sublens_rag
"""

import argparse
import re
import sys
from pathlib import Path

from pypdf import PdfReader
import chromadb
from chromadb.utils import embedding_functions


CHUNK_SIZE = 400      # 글자 수
CHUNK_OVERLAP = 80    # 겹치는 글자 수


def extract_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    # 빈 줄 기준으로 단락 분리 후, 크기 초과 단락은 sliding window로 재분할
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 1 <= chunk_size:
            current = (current + "\n" + para).strip() if current else para
        else:
            if current:
                chunks.append(current)
            # 단락 자체가 chunk_size를 넘으면 sliding window 적용
            if len(para) > chunk_size:
                for start in range(0, len(para), chunk_size - overlap):
                    window = para[start: start + chunk_size]
                    if window.strip():
                        chunks.append(window.strip())
                current = ""
            else:
                current = para

    if current:
        chunks.append(current)

    return chunks


def ingest(pdf_path: str, collection_name: str) -> None:
    print(f"[ingest] PDF 읽는 중: {pdf_path}")
    text = extract_text(pdf_path)
    print(f"[ingest] 추출된 텍스트 길이: {len(text):,} 글자")

    chunks = chunk_text(text)
    print(f"[ingest] 생성된 청크 수: {len(chunks)}")

    db_path = str(Path(__file__).parent / "chroma_db")
    client = chromadb.PersistentClient(path=db_path)

    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="paraphrase-multilingual-mpnet-base-v2"
    )

    # 기존 컬렉션 삭제 후 재생성 (재실행 시 중복 방지)
    try:
        client.delete_collection(collection_name)
        print(f"[ingest] 기존 컬렉션 '{collection_name}' 삭제")
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

    ids = [f"chunk_{i}" for i in range(len(chunks))]
    collection.add(documents=chunks, ids=ids)
    print(f"[ingest] '{collection_name}' 컬렉션에 {len(chunks)}개 청크 저장 완료 → {db_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, help="PDF 파일 경로")
    parser.add_argument("--collection", required=True, help="ChromaDB 컬렉션 이름")
    args = parser.parse_args()

    if not Path(args.pdf).exists():
        print(f"[오류] 파일을 찾을 수 없음: {args.pdf}", file=sys.stderr)
        sys.exit(1)

    ingest(args.pdf, args.collection)
