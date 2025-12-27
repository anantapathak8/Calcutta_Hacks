import os
import time
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer
from utils.terminal_logger import log_event

class SecurityKnowledgeBase:
    def __init__(self):
        self.qdrant_url = os.getenv("QDRANT_URL")
        self.qdrant_key = os.getenv("QDRANT_API_KEY")
        self.collection_name = "sentinel_security_rules"
        self.model = None  # Lazy load the model
        
        if not self.qdrant_url or not self.qdrant_key:
            log_event("RAG", "Qdrant credentials missing. RAG disabled.", "WARNING")
            self.client = None
            return

        try:
            self.client = QdrantClient(url=self.qdrant_url, api_key=self.qdrant_key)
            log_event("RAG", "RAG initialized (model will load on first use)", "INFO")
        except Exception as e:
            log_event("RAG", f"Failed to init RAG: {e}", "CRITICAL")
            self.client = None
    
    def _ensure_model_loaded(self):
        """Lazy load the embedding model on first use"""
        if self.model is None:
            try:
                log_event("RAG", "Loading embedding model (all-MiniLM-L6-v2)...", "INFO")
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                log_event("RAG", "Embedding model loaded successfully", "INFO")
            except Exception as e:
                log_event("RAG", f"Failed to load embedding model: {e}", "CRITICAL")
                raise

    def initialize_collection(self):
        if not self.client: return
        
        try:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            log_event("RAG", f"Collection '{self.collection_name}' created.", "INFO")
        except Exception as e:
            log_event("RAG", f"Error creating collection: {e}", "CRITICAL")

    def add_knowledge(self, documents):
        """
        documents: list of dicts {'text': '...', 'metadata': {...}}
        """
        if not self.client: return
        
        # Ensure model is loaded
        self._ensure_model_loaded()

        points = []
        log_event("RAG", f"Embedding {len(documents)} documents...", "INFO")
        
        # Batch embedding
        texts = [d['text'] for d in documents]
        embeddings = self.model.encode(texts)
        
        from qdrant_client.http.models import PointStruct
        
        for idx, (doc, vector) in enumerate(zip(documents, embeddings)):
            points.append(PointStruct(
                id=idx,
                vector=vector.tolist(),
                payload=doc
            ))
            
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            log_event("RAG", "Knowledge base updated successfully.", "success")
        except Exception as e:
            log_event("RAG", f"Failed to upload vectors: {e}", "CRITICAL")

    def search(self, query, limit=3):
        if not self.client: return []
        
        # Ensure model is loaded
        self._ensure_model_loaded()
        
        try:
            vector = self.model.encode(query).tolist()
            # Using query_points for modern Qdrant versions
            search_result = self.client.query_points(
                collection_name=self.collection_name,
                query=vector,
                limit=limit
            ).points
            
            results = []
            for hit in search_result:
                results.append(hit.payload['text'])
            
            return results
        except Exception as e:
            log_event("RAG", f"Search failed: {e}", "WARNING")
            return []

# Singleton instance
rag_engine = SecurityKnowledgeBase()
