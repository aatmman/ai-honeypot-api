import json
import os

class RAGEngine:
    def __init__(self, knowledge_base_path="knowledge/scam_patterns.json"):
        self.kb_path = knowledge_base_path
        self.knowledge_base = self._load_knowledge_base()

    def _load_knowledge_base(self):
        """Loads the scam patterns JSON file."""
        if not os.path.exists(self.kb_path):
            print(f"Warning: Knowledge base not found at {self.kb_path}")
            return []
        try:
            with open(self.kb_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
            return []

    def retrieve(self, query):
        """
        Retrieves the most relevant scam pattern based on keyword overlap.
        Returns the top matching entry or None if no significant match found.
        """
        query_lower = query.lower()
        best_match = None
        max_score = 0

        for entry in self.knowledge_base:
            score = 0
            # Check for keyword matches
            for keyword in entry.get("keywords", []):
                if keyword.lower() in query_lower:
                    score += 1
            
            # Boost score if category name is in query
            if entry.get("category", "").lower() in query_lower:
                score += 2

            if score > max_score and score > 0:
                max_score = score
                best_match = entry

        return best_match

# Simple test if run directly
if __name__ == "__main__":
    rag = RAGEngine()
    test_query = "The police are calling me about a fedex package with drugs"
    result = rag.retrieve(test_query)
    print(f"Query: {test_query}")
    print(f"Result: {result}")
